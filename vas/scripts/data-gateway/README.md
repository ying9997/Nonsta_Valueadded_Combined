# 数据网关脚本（winit-data）

本目录包含通过万邑通数据网关获取评测/造数所需数据的脚本。

## 数据网关说明

- MCP 端点：`https://windatamcp.winit.com/mcp`
- 认证方式：Bearer token（个人令牌）
- 能力：DWS 查询、SmartBI 报表、知识库搜表、实时库查询（WCS/CWM/IMS/MMS）
- Claude Code skill：`winit-data-access-client`

## 脚本清单

| 脚本 | 用途 | 输出 |
|------|------|------|
| `query_vas_attrs_all.py` | 查询 VAS 属性全量（产品/服务项/原子） | `output/vas_attrs_all.json` |
| `generate_test_seed_requirements.py` | 基于真实数据生成评测种子用例 | `output/test_seed_cases_p0.json` |
| `query_vas_order.py` | 查询指定 VASC 订单详情 | stdout / `output/vas_VASC*.json` |
| `query_plan_event_detail.py` | 查询异常单（PlanEvent）详情 | stdout |
| `query_unusual_event.py` | 查询异常事件列表 | stdout |
| `query_plan_events.py` | 批量查询 PlanEvent 分页 | stdout |
| `probe_detail_api.py` | 探测详情 API 可用字段 | stdout |

## 输出数据（已有快照）

| 文件 | 说明 |
|------|------|
| `output/vas_attrs_all.json` | VAS 全量属性快照 |
| `output/vas_attrs_catalog_p0.json` | P0 属性目录 |
| `output/vas_event_attrs_slim.json` | 异常事件 VAS 属性精简版 |
| `output/test_seed_cases_p0.json` | P0 测试种子用例 |
| `output/测试造数需求_AI客服增值推荐_P0.md` | 造数需求文档 |
| `output/测试造数实施补充_字段模板与验收口径.md` | 字段模板与验收口径 |
| `output/expert-test-dataset-inbound.md` | 入库场景测试数据集设计 |

## 使用方式

### 通过 Claude Code skill 调用

```
/winit-data-access-client
```

skill 会自动连接网关，可直接用自然语言查询 DWS 表。

### 通过脚本调用

```bash
# 需要先设置环境变量（参考 ai_expert 的 .env 配置）
python query_vas_attrs_all.py
python generate_test_seed_requirements.py
```

## 与项目的关系

这些脚本服务于 `eval/` 目录的评测集构建：
1. 用 `query_vas_attrs_all.py` 获取 `systemScopedVascList` 的真实候选数据
2. 用 `query_plan_event_detail.py` 获取异常单上下文作为 eval 输入
3. 用 `generate_test_seed_requirements.py` 批量生成候选评测用例
4. 人工复核后进入 `eval/golden-set.json`
