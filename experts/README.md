# experts

准上线 AI 客服 Expert 包。

这里按线上 Multi-Expert 结构组织，每个 expert 尽量自包含，便于本地测试、Coze 导出、上线验收和后续维护。

## 约定结构

```text
experts/{domain}/{expert-id}/
  manifest.json
  design.md
  coze.config.yml
  workflow/
  nodes/
  prompts/
  tests/
  eval/
  debug/
  deploy/
```

