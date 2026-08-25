# Tool Calling Schema — 增值 AI 指引前端操作接口

> 版本：v1.0
> 日期：2026-08-04
> 状态：待评审
> 用途：AI 侧栏推荐结果驱动前端页面操作的标准化接口定义

---

## 概述

AI 增值指引 Bot 通过结构化 JSON 输出驱动前端页面操作（选择增值产品、填入表单等）。前端监听并执行，双方通过本 Schema 解耦。

---

## 通信方式

| 阶段 | 方式 | 说明 |
|------|------|------|
| 一期 | `afterMessageReceivedFinish` 回调解析 `message.content` 中的 JSON | 纯前端实现 |
| 二期 | `cobra_agent_http` 插件 `tool_call_send`，`function_name: "vas_form_action"` | 经后端中继 |

---

## JSON Schema 定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VAS Form Action",
  "description": "AI 增值指引驱动前端页面操作的结构化指令",
  "type": "object",
  "required": ["function_name", "arguments"],
  "properties": {
    "function_name": {
      "type": "string",
      "const": "vas_form_action"
    },
    "arguments": {
      "type": "object",
      "required": ["actions"],
      "properties": {
        "actions": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/action"
          },
          "minItems": 1
        }
      }
    }
  },
  "definitions": {
    "action": {
      "type": "object",
      "required": ["action", "target", "value"],
      "properties": {
        "action": {
          "type": "string",
          "enum": ["select", "fill"],
          "description": "操作类型：select=下拉选中, fill=文本填入"
        },
        "target": {
          "type": "string",
          "enum": [
            "product",
            "service",
            "requirementBackground",
            "requirementDescription"
          ],
          "description": "操作目标语义 key"
        },
        "value": {
          "type": "string",
          "description": "要选中的选项值或要填入的文本内容"
        }
      }
    }
  }
}
```

---

## Target Key 枚举

| target | 操作类型 | 对应页面控件 | value 示例 |
|--------|---------|-------------|-----------|
| `product` | select | 增值产品下拉框 | `"原单上架"` / `"入库非标增值（特批）"` |
| `service` | select | 增值服务下拉框 | `"补贴原商品条码"` / `"入库其他服务需求"` |
| `requirementBackground` | fill | 需求背景说明 textarea | 自由文本 |
| `requirementDescription` | fill | 需求描述 textarea | 自由文本 |

---

## 输出示例

### 标准增值推荐

```json
{
  "function_name": "vas_form_action",
  "arguments": {
    "actions": [
      { "action": "select", "target": "product", "value": "原单上架" },
      { "action": "select", "target": "service", "value": "补贴原商品条码" }
    ]
  }
}
```

### 非标特批 — SOP 填入

```json
{
  "function_name": "vas_form_action",
  "arguments": {
    "actions": [
      { "action": "select", "target": "product", "value": "入库非标增值（特批）" },
      { "action": "select", "target": "service", "value": "入库其他服务需求" },
      { "action": "fill", "target": "requirementBackground", "value": "客户需要对库内商品重新测量尺重并更换标签后上架，原因是入库时登记的尺寸数据与实际不符。" },
      { "action": "fill", "target": "requirementDescription", "value": "1. 从库位取出指定商品\n2. 重新测量商品尺寸和重量\n3. 根据实际尺重数据更换新的商品标签\n4. 更新系统登记信息\n5. 重新上架到原库位" }
    ]
  }
}
```
