# winit-tom-relay

内网 HTTP 服务：云上通过 **API Key** 访问，由 Relay 代劳 **IAM 登录**、**getToken** 与 TOM `OverseasOBOrder/ajaxProcess`（按**轨迹号**查单）。业务逻辑由同级 [winit-tom-adapter](../winit-tom-adapter) 提供，Relay 负责鉴权、**单租户或多租户**编排、本地文件会话、限流与 Prometheus 指标。

详细设计见 [docs/DESIGN.md](docs/DESIGN.md)。

## 前提

- Node.js ≥ 20
- 与 `winit-tom-relay` **同级** 已拉取 [winit-tom-adapter](../winit-tom-adapter)
- 按部署模式二选一准备凭据，见下 **运行模式**。

## 安装与构建

`npm run build` 的 **prebuild** 会执行 `winit-tom-adapter` 的 `tsc`，请保持同级目录结构不变。

```bash
cd winit-tom-relay
npm install
npm run build
```

## 运行模式

### 单租户（兼容原行为）

使用 **一个** 进程内 `WINIT_*` 账号，与在 adapter 仓目录跑 CLI 相同；API Key 仅控制「谁可访问 Relay」。

- **配置**：`RELAY_API_KEYS` + 在 `.env` 中配置完整 `WINIT_*`（见 [winit-tom-adapter README](../winit-tom-adapter/README.md) / `.env.example`）。
- **未设** `RELAY_TENANT_CREDENTIALS_FILE` 时走本模式。

### 多租户（上千 TOM 账号）

每个 **tenantId** 使用 **自己的** `iamLogin` 等凭据；API Key 通过 `RELAY_TENANT_KEY_MAP` **映射**到 `tenantId`（**一 Key 一租户** 典型）。**IAM 登录态**以序列化 `CookieJar` 存 **本地会话目录**（默认项目根下 `sessions/`，带 TTL），避免每次请求都全量打 IAM。

- **必须**：`RELAY_TENANT_KEY_MAP`、`RELAY_TENANT_CREDENTIALS_FILE`
- **可选**：`RELAY_SESSION_STORE_DIR`（绝对路径，或相对 `process.cwd()` 的路径；未设置时默认为项目根下 `sessions`）
- **不必**在进程里为各租户设 `WINIT_IAM_PASSWORD` 等；账号数据在凭据 JSON 内（**勿提交**该文件真实内容到 Git；生产用 Secret/卷挂入）。
- 会话文件与浏览器 Cookie 同级敏感，请限制目录权限，勿提交到版本库（默认 `.gitignore` 已忽略 `sessions/*`，保留 `sessions/.gitkeep`）。

`RELAY_TENANT_KEY_MAP` 为 **单行 JSON 对象**（`apiKey` → `tenantId`），例：

```json
{"relay-key-for-shop-a":"shop-a","relay-key-for-shop-b":"shop-b"}
```

`RELAY_TENANT_CREDENTIALS_FILE` 为 JSON 文件，结构：

```json
{
  "tenants": {
    "shop-a": {
      "iamLogin": { }
    }
  }
}
```

其中 `iamLogin` 为 **完整** `/api/account/login` 请求体（与 `WINIT_IAM_LOGIN_JSON` 粘贴内容一致，一般为对象）。可选字段与单租户时 `WINIT_*` 一致语义：`iamBase`、`iamOrigin`、`iamReferer`、`cookieSyncHosts`，以及 TOM 侧 `cnomstomBase`、`ordersPage`、`ordersReferer`。

**日志中租户显示**：默认对 `tenantId` 做 **SHA-256 短哈希**；需要明文调试时可设 `RELAY_LOG_TENANT_MODE=plain`（**勿**在公网/开放日志中开启）。

### 密码换票（username / password → access_token）

用于**不**在 Relay 长期配置 `WINIT_IAM_PASSWORD`、也不把静态 API Key 交给终端用户的场景：用户凭 **IAM 用户名与密码**调用换票接口，取得 **短期** `access_token`，再用该 token 作为 `Authorization: Bearer` 调用 `POST /v1/orders/by-tracking`。

- **开启**：`RELAY_EXCHANGE_ENABLED=1`；会话写入与多租户相同的 **本地会话目录**（默认 `sessions/`，可 `RELAY_SESSION_STORE_DIR`）。
- **不存储口令**：密码仅出现在 **当次** `POST /v1/auth/exchange` 请求体内，用于内存中 IAM 登录；**不**写入会话文件、日志或凭据文件。磁盘上仅存 **Cookie 会话快照**（高敏感，须管控目录 ACL）。
- **换票**：`POST /v1/auth/exchange`（**无需**事先配置 `RELAY_API_KEYS` 即可调用；须 **强限流**、生产建议仅内网或 mTLS）。Body：  
  - 单租户：`{ "username", "password" }`  
  - 多租户：另加 `tenantId`（与 `RELAY_TENANT_CREDENTIALS_FILE` 中 `tenants` 键一致；IAM 使用对应租户的 `iamBase` 等非敏感配置）。
- **业务调用**：`Authorization: Bearer <access_token>`。鉴权会 **优先** 将 Bearer 作为换票 token 查会话存储，未命中再按静态多租户 Key / `RELAY_API_KEYS` 处理。
- **登录过期**（TOM/IAM 会话失效）：`POST /v1/orders/by-tracking` 可能返回 **401**，`error.code` 为 **`REAUTH_REQUIRED`**。Relay **不会**用口令代为静默重登。上游应提示用户 **重新**调用 `POST /v1/auth/exchange` 换票；旧 `access_token` 对应会话文件会被删除。

## 环境变量速查

| 变量 | 说明 |
|------|------|
| `RELAY_LISTEN_HOST` / `RELAY_PORT` | 默认 `0.0.0.0` / `8787` |
| **单租户** | `RELAY_API_KEYS`；进程内 `WINIT_*` |
| **多租户** | `RELAY_TENANT_KEY_MAP`、`RELAY_TENANT_CREDENTIALS_FILE`；可选 `RELAY_SESSION_STORE_DIR`、 `RELAY_TENANT_SESSION_TTL_SEC`（默认 2700） |
| **换票** | `RELAY_EXCHANGE_ENABLED=1`、可选 `RELAY_SESSION_STORE_DIR`、可选 `RELAY_EXCHANGE_TOKEN_TTL_SEC`（默认 3600）、`RELAY_EXCHANGE_RATE_MAX`（默认 20）、`RELAY_EXCHANGE_RATE_TIME_WINDOW_MS`（默认 60000） |
| **限流** | `RELAY_TENANT_RATE_MAX`（默认 120）、`RELAY_TENANT_RATE_TIME_WINDOW_MS`（默认 60000）；当前为 **进程内** 计数，多实例互不共享 |
| **其它** | 与 [DESIGN 第 9 节](docs/DESIGN.md) 及上文一致 |

`GET /metrics` 为 **Prometheus** 文本（含 `process` 默认指标 + `relay_http_requests_total`）。建议仅内网/具备网络策略的采集端访问，勿暴露公网。

## 运行

```bash
# 生产
node dist/server.js

# 开发热重载
npx tsx watch src/server.ts
```

`SIGINT` / `SIGTERM` 会关闭 HTTP 服务。

## 接口

- `GET /health`：无鉴权，返回 `status: "ok"` 与 `version`。
- `GET /metrics`：Prometheus 抓取，无鉴权（须网络层约束）。
- `POST /v1/auth/exchange`：换票（需 `RELAY_EXCHANGE_ENABLED=1`）。无 API Key。Body 见上 **密码换票**。
- `POST /v1/orders/by-tracking`：需 **静态** API Key 或换票得到的 **`access_token`**（`Authorization: Bearer`）。Body：`{ "trackingNos": string[] }`。

成功/失败体格式见原说明（`requestId` + `data` 或 `error`）。当 TOM 会话无效且为换票链路时，错误码为 **`REAUTH_REQUIRED`**（401），须重新换票。

## 多副本（K8s 等）说明

- 当前实现面向 **单进程部署**：会话与限流均在 **本机**；多副本之间 **不** 共享登录态，需会话黏滞或改为外置存储（本仓库未内置）。
- **单租户**仅进程内 `WINIT_*` 时，多副本各自一套账号/内存，除非在外层用 LB 固定到单 Pod（一般不推荐作为扩展手段）。

## 与 CLI 的对应关系

- 单租户：`overseasObOrderAjaxProcess(..., { trackingNos })` 与 `tom:order` 等价，轨迹由请求体传入。
- 多租户：同一接口，但 IAM/TOM 凭据与 Cookie 会话**按 `tenantId` 隔离**并落本地会话目录。
