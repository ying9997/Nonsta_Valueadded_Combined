# 本轮怎么跑（METHOD）

日期：2026-08-31（含 Cookie 恢复后扩池）

## 理解

试用要 **3 通不同锚点 VASC** 的真实会话；OMS → 倒查 Udesk；先摘要后切点。

## 逻辑

1. 场景：`sceneOverviewName` + 可用列表过滤 **`sceneOverviewCode=20250407004`**
2. OMS `pageQuery` 拉全池（本轮 **183**）→ `getVasList` 取 sop/WI/EB
3. VASC/WI/EB 反查 Udesk
4. 选 3 张不同 VASC；写摘要四件套

## Cookie / Python

- 登录：`C:\Users\ying.jin\AppData\Local\Programs\Python\Python313\python.exe D:\DA\AI_EXPERT\TOM\共享认证\auto_login.py`  
  （PATH 里没有 `python` 时用完整路径）
- Cookie 落点：`D:\DA\AI_EXPERT\TOM\共享认证\playwright_cookies.json`（勿提交 git）

## 本轮结果

| 项 | 结果 |
|----|------|
| OMS 精确场景池 | 183 |
| Udesk 命中会话 | 6（不同 VASC **4**） |
| 冻结候选 3 通 | `#h28xxs7z`(260013)、空ID/`297108`、`#h28vbs1f`(252453，扩池新命中) |
| 降为备选 | `#h28tw753`(243336) |

## 产物

- `oms_scene_code_pool_to_udesk.json` — 大池 + 倒查
- `sessions/summaries/*.md` — 摘要
- `candidates.json` — 候选表

## 注意

`pageQuery` 的日期 `where` **无效**（总返回全量）；扩池请用 **`sceneOverviewCode`**，不要靠按月日期过滤。
