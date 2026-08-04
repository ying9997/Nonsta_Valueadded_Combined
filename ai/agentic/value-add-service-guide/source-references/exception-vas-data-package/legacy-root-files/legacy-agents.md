# AGENTS.md

本文件约束 AI 在 `value-add-service-guide/exception-vas/` 下生成和更新文档的行为。

## 工作边界

本目录是正式知识库，不是临时草稿目录。AI 写入时必须遵守 [SCHEMA.md](SCHEMA.md)，并同步维护 [index.md](index.md) 和 [log.md](log.md)。

## 数据源优先级

1. 本地静态 JSON：`value-add-service-guide/事件/*.json`
2. 已保存 TOM 快照
3. 接口文档：`value-add-service-guide/interface_document/`
4. SOP、`system-guide/`、`kb/`
5. TOM 实时数据

只有当前四类本地资料不足时，才补 TOM 实时数据；新增实时结果应保存快照。

## 禁止臆测

- 不得静态猜“可选 / 不可选 / 置灰 / 互斥”。
- 不得仅凭 `vasc-master.json` 判断 VASC 到原子的完整绑定。
- 不得把 `vas_event_attrs_slim.json` 当成完整表单真相。
- 不得把附件、模板、上传关系强行归入普通属性字段。
- 不得隐去未确认点。

## whole picture 术语

- 标题使用 `实物流 / Physical Flow`、`信息流 / Information Flow`。
- `实物流` 栏内容写实物前置事实，不写成“实物流入态”或“输入态”。
- 处理完成后的变化写入 `处理结果 / Handling Result`。
- 不使用“实物流出态”“输出态”作为字段名。

## 原子配置术语

- 原子必须使用完整原子 ID + 原子名称。
- 普通属性字段对应 `vaAtomAttrs`。
- 附件、模板、上传关系字段单独列出，并标明来源是否已确认。
