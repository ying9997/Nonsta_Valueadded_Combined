# 发布规则

## 发布 profile

- `governance`：Schema、规则和来源/覆盖报告；强制 `runtime_ready: false`。
- `runtime`：包含通过事实级和关系级门禁的运行时知识切片。

只有 `runtime + runtime_ready: true` 可以供下游 Expert 消费。

## 版本

- MAJOR：契约、Schema、稳定 ID 或语义不兼容变化。
- MINOR：新增已核实范围、实体、关系或运行时切片。
- PATCH：不改变语义契约的纠错和来源补强。

`VERSION`、CHANGELOG、发布目录、manifest 和 tag 必须一致。

## 确定性构建

- 固定输入提交、Node/npm、锁文件、生成器和 Schema 版本。
- 固定路径分隔符、文件顺序、编码、换行、JSON 键顺序、压缩参数和文件元数据。
- 校验和文件覆盖包内除自身外的文件，禁止摘要循环引用。
- 最终验证结果写入包外收据，不回写被验证包。

## 发布包禁止内容

- Expert 路由、Prompt、工作流、插件和代码节点。
- 凭证、客户数据、未脱敏截图和受限内部内容。
- draft、pending、deprecated、superseded 或 restricted 业务内容。
- 原始证据全集和项目外路径。
- 浮动版本或 `latest` 依赖。

## 人工确认

创建或修改远程、push、tag、release、公开发布和外部导入前，必须获得 Henry 当次明确确认。

本地包生成、Git 提交、远程推送、下游导入、Coze 导出、Coze 发布和线上验证必须分别记录，不能互相冒充。

