# supplier-tracking 代码节点

| 节点 | 说明 |
|------|------|
| `validate-input.ts` | 最小事实校验；注入 `analysisClock` |
| `load-supplier-tracking-knowledge.ts` | 产出 `kbMd`（**由脚本从内嵌 KB 生成**，勿手改正文） |
| `llm-analyze.ts` | LLM 占位声明；正文见 `../prompts/main.md` |
| `format-output.ts` | 归一化 `analysisResult`；`expertId` = `supplier-tracking`；**恒** `fetchStatus=fallback_links`、`events=[]` |

本专家**不含**官网 HTTP 抓取节点；轨迹拉取由 **`delivery-status`** 与系统侧 API 另案承担。

## 维护 KB

1. 编辑 [../prompts/kb.md](../prompts/kb.md)（与 [docs/experts/last-mile/supplier-tracking/carrier-portals.md](../../../../docs/experts/last-mile/supplier-tracking/carrier-portals.md) 对齐）。
2. 运行：

```bash
node experts/last-mile/supplier-tracking/scripts/embed-kb-into-load.mjs
```

3. 重新导出 Coze 包：`npm run export:coze -- experts/last-mile/supplier-tracking`
