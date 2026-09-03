# D+2 演示命令

所有命令从项目根执行。输入、输出均使用绝对路径，避免脚本按自身目录解析相对路径。

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
```

## 一次性确认 7 条分布

预期：L1=1、L2=1、L3=1、L4=4，真实 LLM 无失败。

```powershell
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\final_results
```

## L1：需求不完整

- 单号：`VASC000000183069`
- 预期：`needs_requirement_clarification`
- 展示点：规则先拦截，LLM 只生成人话追问，不进入场景匹配和 SOP。

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000183069 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l1
```

## L2：场景歧义，转人工

- 单号：`VASC000000344421`
- 预期：`transfer_human`
- 展示点：数量差异、SN 辨识、多新单混合，当前规则不强套 F-001。

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000344421 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l2
```

## L3：命中 F-001，但缺资料

- 单号：`VASC000000343821`
- 预期：`needs_field_clarification`
- 展示点：缺「操作说明附件」「商品和标签的对应关系」，LLM 生成补资料话术。

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000343821 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l3
```

## L4-A：箱序辨识后补贴包裹条码

- 单号：`VASC000000333147`
- 预期：`sop_generated`
- 单据：`EB0126080632030982` / `WI51547628`

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000333147 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l4a
```

## L4-B：多 SKU 分新单上架

- 单号：`VASC000000326061`
- 预期：`sop_generated`
- 单据：`EB0326072531612017` / `WI51383223`、`WI51383191`

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000326061 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l4b
```

## L4-C：按型号辨识并换条码

- 单号：`VASC000000143515`
- 预期：`sop_generated`
- 单据：`EB0125081521891412` / `WI45365806`

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000143515 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l4c
```

## L4-D：尺重辨识后换标上架

- 单号：`VASC000000080416`
- 预期：`sop_generated`
- 单据：真实多张 EB / `WI41289403`、`WI43089765`

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts `
  --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json `
  --order VASC000000080416 `
  --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_l4d
```

## 发飞书（只建议演示 L1/L2/L3）

在对应命令末尾追加：

```powershell
--send-feishu
```

L4 当前以控制台展示 SOP 草稿为主，不自动审核、不写回 OMS。
