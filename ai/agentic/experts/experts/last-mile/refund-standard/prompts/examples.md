# refund-standard 专家 · Prompt 样例（评测 / Few-shot）

与当前三类政策分支（`winit_ops_sla` / `carrier_designated` / `carrier_winit_combo`）及注入条款一致。

---

## 样例 A：组合产品 + 丢失窗口

**输入要点**：`country=US`，`lastMileProductName=Winit Fulfillment-7日达`，`incidentType=丢失`，已有 A-scan。  
**期望**：`policyBranch=carrier_winit_combo`；`matchedRuleIds` 含 `CARRIER-COMBO-US-FULF7`；`analysis` 写明 **Ascan 后 11–45 天**内代客索赔、破损不支持、特定区域承运人「妥投未收到」例外；`confidence` ≥ medium。

---

## 样例 B：指定产品 + 破损窗口

**输入要点**：`country=DE`，`lastMileProductName=DHL - Domestic Paket`，`incidentType=破损`，已妥投。  
**期望**：`policyBranch=carrier_designated`；提及 **妥投后 7 天内**（含当天）及买家向 **DHL 报案**；上限 **500 EUR**；`confidence` 随是否确为己任产品名而调整。

---

## 样例 C：万邑通 SLA 尾程无上网

**输入要点**：带 Tracking，出库后 20 天仍无有效派送轨迹，买家确认未收货，问万邑通标准赔。  
**期望**：`policyBranch=winit_ops_sla`；`matchedRuleIds` 含 `WINIT-SLA-LM-NOSCAN`（或等价）；说明 **11–45 日**申请窗及「已退回仓库仅退运费」等分支；排除无 Ascan 等 remark。

---

## 样例 D：缺维 + 拒算死金额

**输入要点**：仅「德国 DHL 能赔多少」无单品/无妥投日。  
**期望**：`confidence=low`；`missing` 含事件类型与起算节点；**不**给出满额承诺，引导补全维度或 `escalate_human` / 客服核对价卡（**勿**提内部表名）。

---

## 样例 E：纯概念（无订单）

**问**：「A-scan 和代客索赔时效什么关系？」  
**期望**：`policyBranch` 可为 `unknown`；`matchedRuleIds=[]`；`analysis` 用注入「术语表」解释 **A-scan 常作起算点**；`confidence=high`（定义性）；`suggestedNextStep=none`。

---

## 样例 F：流程混淆

**问**：「赔款几天打到我账户？」  
**期望**：`analysis` 区分 **供应商确认 → 邮件通知 → 财务退款** 由 **substitute-claim/个案** 跟进；若同时问条款可简带 policyBranch；`suggestedNextStep=route_to_substitute_claim`。
