# B0102E23 待查字段与原子

来源：`test_prompt_B0102E23.json.intentTriples` 和 `expectedOutput`

本文件只记录测试用例中出现但缺少接口字段证据的项目，避免把未查证内容写成已确认字段。

## Pending 清单

| 项 | 出现场景 | 当前描述 | 缺口 | 后续来源 |
|----|----------|----------|------|----------|
| 拍照/视频相关原子 | 入库非标拍照或提供视频 | `serviceItems`: 拍照/视频相关原子（待 getVascInfo 确认） | 原子编码、字段、附件要求未知 | getVascInfo / BaseAttrRel |
| 直接上架 | 原单上架（直接上架） | `serviceItems`: 直接上架 | 是否有原子编码或产品级字段未知 | getVascInfo |
| 入库-补贴包裹条码 | 新单上架（客户创建入库单） | `serviceItems`: 入库-补贴包裹条码 | 原子编码、字段枚举未知 | getVascInfo / BaseAttrRel |
| 销毁相关原子 | 上架前销毁 | `serviceItems`: 销毁相关原子 | 原子编码、字段、附件要求未知 | getVascInfo / BaseAttrRel |
| 自提相关原子 | 上架前自提 | `serviceItems`: 自提相关原子 | 原子编码、字段、附件要求未知 | getVascInfo / BaseAttrRel |

## 使用约束

- 上表项目不得在对客话术中输出为已确认字段枚举。
- 若系统候选包含对应产品，AI 可推荐产品，但字段提示必须写“需按页面/接口返回填写”或追问必要信息。
