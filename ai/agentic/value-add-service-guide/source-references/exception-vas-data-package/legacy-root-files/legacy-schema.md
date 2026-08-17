# 异常与增值服务知识库 Schema

## Frontmatter

所有正式 Markdown 文档应包含：

```yaml
---
title: 文档标题
type: reference | rules | template | source-map | standard
tags: [exception, vas]
sources: [local-json | tom-snapshot | interface-document | system-guide | kb]
updated: YYYY-MM-DD
confidence: high | medium | low
fidelity: preserve | synthesize
status: draft | reviewed
---
```

## 文档类型

| type | 用途 |
|---|---|
| `reference` | 索引、目录、解释型资料 |
| `rules` | 业务规则、动态判断规则 |
| `template` | 文档模板 |
| `source-map` | 字段来源和证据映射 |
| `standard` | 写作规范、术语规范 |

## 推荐标签

- `exception`
- `vas`
- `vasc`
- `atom`
- `inbound`
- `whole-picture`
- `source-map`
- `field-config`
- `tom`
- `sop`
- `interface`
- `template`
- `standard`

## 命名规范

- 文件名使用小写 kebab-case。
- VASC 目录可使用 `VASC编码-英文业务名`，例如 `VASC202407031503503-original-inbound-putaway`。
- 中文业务名写在标题和正文中，不放入文件名。

## 文档维护规则

- 新增、移动、删除文档后，必须更新 [index.md](index.md)。
- 重要规范变更或业务文档新增后，必须更新 [log.md](log.md)。
- 不确定内容必须在正文中标注“未确认点”。
