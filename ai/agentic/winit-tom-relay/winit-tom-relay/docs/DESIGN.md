# winit-tom-relay 设计文档

## 1. 文档信息

| 项目 | 说明 |
|------|------|
| 项目名称 | `winit-tom-relay` |
| 仓库位置 | 与 `winit-tom-adapter` **同级目录**（例如 `…/projects/winit-tom-adapter` 与 `…/projects/winit-tom-relay`） |
| 版本 | v0.1 |
| 关联仓库 | `winit-tom-adapter`：IAM / Cookie / CSRF / TOM AJAX 等可复用逻辑 |

---

## 2. 背景与目标

### 2.1 问题

- 部署在云上的 Agent **无法访问内网** TOM 相关域名。
- 需在 **能访问 TOM 的网络** 内提供受控 HTTP 服务，供公网或云上调用。
- 部分 TOM 请求 **可能超过 20 秒**，全链路超时与代理层配置需一致。

### 2.2 目标

1. **连通**：云上仅调用 Relay，由内网 Relay 完成对 IAM/TOM 的 HTTP 调用。
2. **安全**：强鉴权、最小暴露面、可审计；禁止「任意 URL」开放代理。
3. **可运维**：健康检查、结构化日志、指标；**水平扩展**在采用文件会话时须评估会话目录与限流的进程边界（见 6.3、第 8 节）。
4. **复用**：业务逻辑尽量 **依赖同级 `winit-tom-adapter` 包**（npm 发布或 `file:../winit-tom-adapter`），避免重复实现。

### 2.3 非目标（首期）

- 替代企业统一 API 网关（WAF、全链路灰度可由基础设施承担）。
- 在 Relay 内实现与 TOM 无关的通用 BFF。

---

## 3. 仓库与目录关系

```
projects/
├── winit-tom-adapter/          # 现有：库 + CLI，可发布 npm 包
│   └── package.json          # name 如 @scope/winit-tom-adapter
└── winit-tom-relay/          # 本仓库：仅 HTTP 服务
    ├── docs/
    │   └── DESIGN.md         # 本文档
    ├── src/
    │   ├── server.ts         # 入口：监听端口
    │   ├── routes/           # 路由与 handler
    │   ├── auth/             # API Key / mTLS 等
    │   ├── config/           # 环境变量、超时、白名单
    │   └── sessionStore/     # 文件会话存储（TTL、逻辑键哈希落盘）
    ├── package.json
    └── Dockerfile            # 可选
```

**依赖约定**

- `winit-tom-relay` 的 `package.json` 通过 **`file:../winit-tom-adapter`**（开发）或 **发布后的包名 + 版本**（生产）依赖 `winit-tom-adapter`。
- **不在** Relay 仓库内复制 IAM/TOM 核心逻辑；若需扩展，优先在 `winit-tom-adapter` 增加导出 API，Relay 只做 HTTP 与编排。

---

## 4. 技术栈

| 层次 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js **20 LTS** | 与 `winit-tom-adapter` 一致，便于联调 |
| 语言 | TypeScript | 严格模式 |
| HTTP 框架 | **Fastify**（或 Hono） | 低开销、schema 校验友好 |
| 请求体验证 | **Zod**（或 valibot） | 与配置、路由入参统一 |
| 上游调用 | 复用 `winit-tom-adapter` 的 `HttpSession`、`CookieJar`、`*Process` 等 | 出站 `fetch` 保持 keep-alive；按接口配置超时 |

**并发与性能**（摘要）

- I/O 为主：单进程事件循环；**多副本 / 多 worker** 扩展时须与会话存储策略一致（文件会话默认不跨实例共享，见 6.3）。
- 对 TOM 出站：**连接复用** + **并发上限（信号量）**，避免 in-flight 拖垮内存与 FD。
- CPU 密集路径再评估 **Worker Threads**（多数场景不需要）。

---

## 5. 总体架构

```
[ 云 Agent ]
    │  HTTPS + 鉴权（超时 ≥ TOM 慢请求上限）
    ▼
[ 公网入口：隧道 / LB / 反代 TLS ]
    │
    ▼
[ winit-tom-relay @ 内网 ]
    │  复用 winit-tom-adapter
    ▼
[ IAM ] ──► [ TOM Web / AJAX ]
```

**网络**

- 优先 **出站隧道**（如 Cloudflare Tunnel、FRP 等，以公司合规为准）暴露 Relay，避免非必要「公网直连内网防火墙入站」。
- 反代（Nginx/Caddy）的 **read / idle 超时** 须 **大于** Relay 对 TOM 的最长等待时间。

---

## 6. API 设计原则

### 6.1 主推：业务型接口（胖 Relay）

云上只传业务参数，**不传**长期 Cookie；登录态在 Relay 侧维护（单租户可为进程内；多租户与换票为 **本地文件会话**，带 TTL，见 6.3 / 6.4）。

示例（路径仅为示意）：

- `POST /v1/customers/search` — 内部调用 `customersAjaxProcess` 同类流程。
- `POST /v1/orders/overseas-ob` — 内部调用订单 AJAX 流程。

**响应**：统一 envelope（`requestId`、业务数据、错误码），错误信息不泄露内网细节。

### 6.2 受限透传（可选、需审批）

若 PoC 需要：仅允许 **method + host 白名单 + path 前缀**，禁止任意 Host；默认生产关闭或仅限内网。

### 6.3 多租户：上千 TOM 账号

- **租户（tenant）**：稳定 `tenantId`，与 **一套 IAM 凭据**（一个 TOM 业务账号）一一对应。Relay **不在**进程内为所有账号配置单一 `WINIT_*` 集合；改为 **按请求解析租户** 后，从 **凭据源** 取该租户数据，用 **winit-tom-adapter** 显式入参完成 `iamLogin` / `iamGetToken`，再调 TOM。
- **身份与映射**（可并存，按安全模型选择）：
  - **一 Key 一租户**：`Authorization: Bearer` / `X-API-Key` 中的 Key 通过配置映射到唯一 `tenantId`（Key 与 IAM 不混存储；Key 仅作 Relay 入口鉴权与路由租户）。
  - **服务 Key + 头**：`X-Tenant-Id`（或 `X-Winit-Account-Id`）**必须**配合 mTLS/内网隔离，防伪造；否则不启用。
- **会话外置（千级账号）**：`CookieJar` 序列化后写入 **`RELAY_SESSION_STORE_DIR` 指定的目录**（默认项目根下 `sessions/`，子目录 `entries/` 内存放带 TTL 的 JSON 文件；逻辑键如 `winit-tom-relay:session:<tenantId>` 经 **SHA-256** 映射为文件名）。禁止在高并发下对同一租户**每次请求**全量 IAM 登录，避免 IAM 限流与延迟放大。
- **单飞与锁（当前实现）**：面向 **单机单进程** 部署。同 `tenantId` 需补登时，用 **进程内 Promise 串行**（每租户互斥队列）串行化「登录 + 写回会话」，避免惊群；**非**跨机分布式锁。若未来多副本共享会话，需另行引入外置存储或协调机制。
- **多副本说明**：当前文件会话 **不** 在实例间共享；多 Pod 横向扩展时各实例目录独立，除非挂载 **同一读写卷** 且自行评估并发与锁语义（本仓库未内置）。

### 6.4 密码换票（不持久化口令）

- **`POST /v1/auth/exchange`**（需 `RELAY_EXCHANGE_ENABLED=1`）：请求体携带 **IAM 用户名与密码**（及多租户时 `tenantId`）。凭据**仅在当次请求内存**中用于 `iamLogin` + `iamGetToken`，**不写入**日志、凭据文件；**口令不落盘**。
- 成功后返回 **`access_token`**（opaque，非 IAM 密码）；**会话目录**中仅存 **`CookieJar` 序列化**与 TOM 元数据，逻辑键前缀 `winit-tom-relay:exch:`，带 TTL（与多租户会话共用同一存储实现）。后续 `Authorization: Bearer` 可优先按换票条目解析，再走静态多租户 Key 或 `RELAY_API_KEYS`。
- **TOM 会话过期**（本链路）：Relay **不**用口令静默重登；应返回 `error.code = REAUTH_REQUIRED`（HTTP 401），**删除**该 `access_token` 对应的会话文件，上游须再次调用换票。磁盘上的 Cookie 快照仍属高敏感，目录权限与备份策略同 6.3。

---

## 7. 超时与慢请求（>20s）

| 链路 | 建议 |
|------|------|
| Relay → TOM | 按接口配置 **独立** 超时（如 60s～120s），**勿**与 Agent 侧 20s 混用；使用 `AbortSignal` / Undici 可配项。 |
| Agent → Relay | **≥** TOM 侧上限 + 缓冲（例如 TOM 120s 则 Agent 至少 130s+）。 |
| 反代 / 云 LB | **≥** 同上，避免出现「LB 20s 断开、TOM 仍在跑」。 |

若经常出现极长同步请求，后续可演进为 **202 + jobId + 轮询/回调**。

---

## 8. 安全

- **传输**：TLS；隧道与证书轮换策略明确。
- **鉴权**：API Key、（可选）mTLS、短期服务 JWT；密钥轮换。
- **网络**：可选云出口 **IP allowlist**；内网防火墙仅放行 Relay 到 IAM/TOM 必要目标。
- **限流**：按 **租户 / API Key / IP**；**最大 body**、**最大并发** 对 TOM 出站限流。当前 `@fastify/rate-limit` 为 **进程内** 计数；多副本若需全局配额，需外置存储或网关层限流（本仓库未内置）。
- **日志**：脱敏（Cookie、Authorization 原文、整段 `WINIT_IAM_LOGIN_JSON`、客户敏感字段）；`requestId` 贯通；**多租户**下每条业务日志带 `tenantId` 或**不可逆短哈希** `tenantIdHash`（可配置不输出明文创收合规）。
- **凭据与会话文件**：落盘/内存中的 **租户凭据** 与 **`sessions/`（或可配置目录）下的会话快照** 均按公司密钥与磁盘访问规范管控；**网络分区**时宁可失败，**不**将请求降级为「匿名/默认账号」。

---

## 9. 配置与环境变量（示例维度）

- `RELAY_LISTEN_HOST` / `RELAY_PORT`
- 单实例 **单 TOM 账号**（与旧行为兼容）：`RELAY_API_KEYS` 与**进程级** `WINIT_*`（同 `winit-tom-adapter` 文档；**仅存在于 Relay 部署环境**）。
- **多租户**（与单租户二选一，由是否配置租户凭据等决定，见 [README#运行模式](README.md#运行模式)）：
  - `RELAY_SESSION_STORE_DIR`（可选）：会话文件根目录；未设置时默认为项目根下 `sessions`（相对 `initRuntime` 所在包路径解析，见 README）
  - `RELAY_TENANT_KEY_MAP` 或等效**文件**：API Key 到 `tenantId` 的映射
  - `RELAY_TENANT_CREDENTIALS_FILE`：各租户 IAM/TOM 覆盖字段（JSON；不落 Git 明文，由运维注入 Secret）
  - `RELAY_TENANT_SESSION_TTL_SEC`（Cookie 快照 TTL；默认 2700）
  - `RELAY_TENANT_RATE_MAX` / `RELAY_TENANT_RATE_TIME_WINDOW_MS`（每租户限流窗口，进程内）
- `TOM_REQUEST_TIMEOUT_MS`（可按路由覆盖）
- `TOM_MAX_CONCURRENT`（全局或分接口）
- **换票**（见 6.4）：`RELAY_EXCHANGE_ENABLED`、与多租户共用 **`RELAY_SESSION_STORE_DIR` / 默认 `sessions`**、`RELAY_EXCHANGE_TOKEN_TTL_SEC`、`RELAY_EXCHANGE_RATE_MAX` / `RELAY_EXCHANGE_RATE_TIME_WINDOW_MS`

具体键名与 `winit-tom-adapter` 文档、仓库 [README](README.md) 对齐。

---

## 10. 可观测性

- **健康**：`GET /health`（或 `GET /ready` 含对 IAM/TOM 的轻量探测，慎用以免刷爆内网）。
- **日志**：JSON 行日志，`requestId`、路由名、耗时、HTTP 状态、业务错误码。
- **指标**：QPS、延迟分位、4xx/5xx、TOM 超时次数；**多租户**下在标签或结构字段中带 `tenant`（或哈希），可选 **Prometheus** `/metrics` 导出；避免高基数爆炸时可仅聚合为全局 + 少数字段码。

---

## 11. 部署与发布

- **容器**：`NODE_ENV=production`；多副本时须单独规划 **会话目录**（见 6.3）。若根文件系统只读，需将 **`RELAY_SESSION_STORE_DIR`** 挂到 **可写卷**（emptyDir/PVC 等）。
- **进程管理**：K8s / systemd；**优雅关闭**（停止接新请求、Drain 现有长请求）。
- **发布**：镜像 tag 与 `winit-tom-adapter` 版本 **显式对应**（changelog 或依赖锁文件）。

---

## 12. 实施阶段

| 阶段 | 内容 |
|------|------|
| PoC | 单路由 + `file:../winit-tom-adapter` + 隧道打通；超时调通 |
| v0.1 | 鉴权、限流、统一错误体、健康检查、文档化环境变量；单租户或开发态 |
| v0.2 | 多接口、**多租户**、**文件会话**、**凭据外置**、每租户限流与指标、监控告警 |
| 生产 | HA、密钥/凭据轮换、渗透测试与合规项闭环 |

---

## 13. 风险与依赖

- **上游变更**：TOM 页面/HTML 变更导致解析失败 — 契约测试、版本化依赖 `winit-tom-adapter`。
- **合规**：隧道数据路径需与安全/法务确认。
- **单点与会话**：当前 **文件会话** 默认面向单机；多副本下实例间 **不** 自动共享登录态，需外置协调（共享卷 / 外置 KV / 网关黏滞等）另行设计；粘性会话**不能**单独解决凭据多账号与容灾，仅作历史兼容时慎用。
- **IAM 惊群与错误凭据**：单租户重试与并发登录需**熔断/退避**，避免对 IAM 的放大攻击（含错误密码场景）。

---

## 14. 修订记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-04-23 | v0.1 | 初稿：同级目录仓库、依赖 login、超时与安全摘要 |
| 2026-04-24 | v0.2 设计 | 增补多租户、外置会话、凭据外置、限流/指标与实施阶段 |
| 2026-04-25 | v0.2 | 6.4 密码换票、`REAUTH_REQUIRED` 与 `RELAY_EXCHANGE_*` 配置 |
| 2026-04-26 | v0.2 | 会话由 Redis 改为 **本地文件目录**（`RELAY_SESSION_STORE_DIR`）；限流为进程内；设计文档与实现对齐 |
