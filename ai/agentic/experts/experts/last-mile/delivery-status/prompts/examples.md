# 物流轨迹分析 - 示例

供 LLM 作为 few-shot 参考，可选择性复制到 Prompt 中。

**说明**：`structured.scanFacts` 由工作流在 **`format-output`** 中自 `enrichedContext.computedScanFacts` 注入，**勿**在模型输出的 JSON 里包含 `scanFacts`；下表示例的 `analysis` 须与当次 `nodes` / `computedScanFacts` 可核验信息一致（此处为脱敏示范）。

---

## 示例 1：派送未成功（有异常，无对客建议）

**输入**：enrichedContext 含 `computedScanFacts` 中该单 `deliveryFailureLikely: true`、末条为派送类节点；`customerIntent`：异常排查

**输出**：

```json
{
  "analysisResult": {
    "structured": {
      "orderIds": [
        "SO-20240310001"
      ],
      "trackingIds": [
        "YD-1234567890"
      ],
      "documentRefs": [
        {
          "type": "出库单",
          "id": "SO-20240310001"
        }
      ],
      "carriers": [
        {
          "trackingNo": "YD-1234567890",
          "carrierCode": "FEDEX",
          "standardCarrier": "FedEx"
        }
      ]
    },
    "analysis": "承运商 FedEx，运单 YD-1234567890。按时间线：先前节点曾显示在途与到达区域分拨，末段为派送尝试。最后一条可核验记录时间为 3 月 12 日 14:30，地点与承运商描述一致；事件说明含「联系不上收件人/无人签收」类表述。与 `computedScanFacts` 中「派送失败类信号」为 true 一致。时间均为承运商/轨迹页提供的本地或混用时区时间；与 `analysisClock`（UTC）比较时未直接作小时级差，因非同一时区基线。\n\n若需区分退回妥投（RDscan）与正常妥投（Dscan），以节点 `status` 与地点是否对应收件侧为准；本例未在节点表中出现 Dscan 作为客户签收终态。"
  }
}
```

---

## 示例 2：在途/枢纽阶段（全链路事实，无「预计送达」式承诺）

**输入**：enrichedContext 含轨迹已到达目的地城市分拨中心，无妥投、无 Dscan

**输出**：

```json
{
  "analysisResult": {
    "structured": {
      "orderIds": [],
      "trackingIds": [
        "YD-xxx"
      ],
      "documentRefs": [],
      "carriers": [
        {
          "trackingNo": "YD-xxx",
          "standardCarrier": "UPS"
        }
      ]
    },
    "analysis": "承运商 UPS。按时间线：最新可核验状态为已到达 **XX 市** 分拨/处理中心（以末条 `nodes` 的 `description` 与 `location` 为准）；尚未出现 Dscan/妥投类扫描。节点时间与地点均为承运商返回的事件描述。未在轨迹中载明未来派送日期，故不作送达日承诺。当前未标记严重异常（P0–P1），以节点原文为准作客观描述。"
  }
}
```

---

## 示例 3：含 Ascan / Dscan 的完整里程碑（与 computedScanFacts 一致）

**输入**：OpenAPI 轨迹 `nodes` 中含 Ascan 与 Dscan 节点；`computedScanFacts` 已列出各事件的时间与地点

**输出**：

```json
{
  "analysisResult": {
    "structured": {
      "orderIds": [
        "SO-xxx"
      ],
      "trackingIds": [
        "YD-xxx"
      ],
      "documentRefs": [
        {
          "type": "出库单",
          "id": "SO-xxx"
        }
      ],
      "carriers": [
        {
          "trackingNo": "YD-xxx",
          "carrierCode": "DHL",
          "standardCarrier": "DHL Express"
        }
      ]
    },
    "analysis": "承运商 DHL Express。出库单 SO-xxx 与运单 YD-xxx 对应。\n\n**时间线（与 `nodes` 及 `computedScanFacts` 一致）**：\n- **Ascan**：在 [日期时间] 于 [location 原文] 出现到件/入网类扫描，状态码为 Ascan。\n- 中间节点：在途/枢纽处理等（按节点顺序简述）。\n- **Dscan**：在 [日期时间] 于 [location 原文] 出现妥投类扫描，状态码为 Dscan；**非** RDscan（无退回路径终态混同）。\n- **RDscan**：本单 `computedScanFacts.rdscanEvents` 为空，故未将退回妥投与收件人签收混读。\n\n**派送失败**：`deliveryFailureLikely` 为 false，与节点中无未成功妥投的强证据一致。\n\n**数据范围**：本例假设 OpenAPI 在账号内命中；若 `fetchMeta.notes` 提示公开页兜底，需另行在正文中写清「仅供参考」等边界（此处从略）。"
  }
}
```

---

## 示例 4：供应链关联（单号/单据为事实，无操作建议）

**输入**：enrichedContext 含多单号与单据引用，customerIntent：供应链追溯

**输出**：

```json
{
  "analysisResult": {
    "structured": {
      "orderIds": [
        "SO-xxx",
        "PO-20240308001"
      ],
      "trackingIds": [
        "YD-xxx"
      ],
      "documentRefs": [
        {
          "type": "出库单",
          "id": "SO-xxx"
        },
        {
          "type": "采购单",
          "id": "PO-20240308001"
        }
      ],
      "carriers": [
        {
          "trackingNo": "YD-xxx",
          "carrierCode": "DHL",
          "standardCarrier": "DHL Express"
        }
      ]
    },
    "analysis": "承运商 DHL Express。在可见轨迹与入参中：出库单 SO-xxx 与运单 YD-xxx 关联；采购单 PO-20240308001 为同一批次引用（以 `documentRefs` 与轨迹摘要为准）。上游供应商/下游客户在入参中记为：XX 工厂、YY 公司（转述入参，非轨迹 API 必返字段）。未添加与轨迹无关的经营建议。"
  }
}
```
