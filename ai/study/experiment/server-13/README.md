# server-13 — 个人实验环境复现记录

> **服务器**：139.199.229.213（个人项目）  
> **目标**：把 40 服务器上的业务支持流程，在本地编辑后于 13 上 **跑通一条叙事线** 即算验证成功。  
> **不必** 在 13 上复制整套 OpenClaw / 14 个 Agent。

## 环境对照

| 项 | 本地 (Windows) | 40 服务器 | 13 服务器 |
|----|----------------|-----------|-----------|
| 角色 | 编辑 + 调试 | 生产 Agent 真源 | 个人验证 |
| 代码 | `D:\DA\AI_EXPERT` | `~/.agents/skills/` 等 | git clone 同仓库 |
| Skill 真源 | 无（备忘见 `40部署/`） | `~/.agents/skills/<name>/` | 可选 symlink 单 Skill |
| TOM | VPN + cookies | 同左 | 需 VPN + 配 `.env` |
| BI 数仓 | VPN + connection.json | 同左 | 同左 |
| 视觉 API | PlanEvent `.env` | 各 Agent 配置 | 自备 Key |

## 推荐验证顺序

| 顺序 | 叙事线 | 冒烟标准 | 13 状态 |
|------|--------|----------|---------|
| 1 | [04_planevent-exception-chain](../../../narrative(xushi)/04_planevent-exception-chain/README.md) | `run_unusual_event_analysis.py --max-rows 2` 产出 JSON | `todo` |
| 2 | [01_data-pull-tom-csv](../../../narrative(xushi)/01_data-pull-tom-csv/README.md) | `query_plan_events.py --save` 成功 | `todo` |
| 3 | [02_bi-query-psc](../../../narrative(xushi)/02_bi-query-psc/README.md) | `test_connection.py` 通过 | `todo` |
| 4 | [06_skill-lifecycle](../../../narrative(xushi)/06_skill-lifecycle-local-40-13/README.md) | 04 跑通后打 Skill 包 | `todo` |

## 13 首次部署检查表

```bash
# 1. 克隆仓库
git clone <your-repo-url> ~/AI_EXPERT
cd ~/AI_EXPERT

# 2. Python 依赖
pip install playwright python-dotenv requests beautifulsoup4 openpyxl pandas openai
playwright install chromium
pip install -r 数据库/尾程BI查库工具包/requirements.txt

# 3. TOM 凭证
cp TOM/共享认证/.env.example TOM/共享认证/.env
# 编辑 TOM_USERNAME / TOM_PASSWORD

# 4. FMS（图片下载）
cp FMS文件访问/fms_config.example.json FMS文件访问/fms_config.json

# 5. PlanEvent 视觉 API
cp TOM/PlanEvent查询/env.example.txt TOM/PlanEvent查询/.env
# 编辑 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL

# 6. BI 数仓（若跑 02）
cp 数据库/尾程BI查库工具包/credentials/connection.example.json \
   数据库/尾程BI查库工具包/credentials/connection.json
```

## 04 主角线冒烟（13 上执行）

```bash
cd ~/AI_EXPERT/TOM/PlanEvent查询

python run_unusual_event_analysis.py \
  --event-code B0901E02 \
  --start-time 2026-04-20 \
  --end-time 2026-04-21 \
  --max-rows 2 \
  --skip-classify \
  --skip-export
```

**通过标准**：`output/unusual_event_B0901E02_*.json` 存在且 `count >= 1`。

## 变更记录

| 日期 | 叙事线 | 结果 | 备注 |
|------|--------|------|------|
| — | 04 | todo | 待首次在 13 执行后填写 |
