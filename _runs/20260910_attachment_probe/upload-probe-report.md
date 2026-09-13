# 附件上传探测报告

生成时间：2026-09-10T21:31:27
测试单：`VASC000000360654`（白名单；未调用 vaOrderReview）

## 上传 API

页面 SDK：`/Public/vendor/fmsUpload.js`（三步）

1. `POST https://cnomstom.winit.com.cn/VasOrder/getFmsAuthorization`  
   `locationName=FMS00002-CNR-TEMP-OWH-ALL`  
   返回 `info.sign` + `info.time`（TOM Cookie + CSRF）
2. `POST https://cnfmsstream.winit.com.cn/upload`（multipart）  
   表单：`file` + `locationName`  
   Header：`platform=fms`、`user=fms_cn_tom`、`version=V1.0`、`Authorization=<sign>`、`signDate=<time>`  
   **不要带 OMS Cookie / CSRF**，否则 400 空 body
3. `POST /VasOrder/getFmsImageToken` `objectURI=...`（给预览用，写入槽位不是必须）
4. 挂到增值单：`POST /VasOrder/ajaxSave` `api=oms.VaOrderService_updateAtomDetails`，`vaAtomFiles[]`（`fileType`/`fileName`/`url`）

页面另有：`oms.VaOrderService_batchUploadMerchandiseAttachment`（标签示例图，不是通用附件槽）

## 上传测试
| 文件 | fieldKey | 上传成功 | OMS 可见 | 可删除 |
|------|---------|---------|---------|--------|
| copilot-attachment-probe-20260910.txt | VAS_ATTR_REL_AOOI | 是 | 是 | 是 |

FMS 返回 `objectURI=cbf7fd88f95043fe9fe149327c4efa2b/2026/09/10/b3c1b3f2f96e4e01848f814171466d68.txt`。随后从 `vaAtomFiles` 去掉探测文件，订单上已无该文件。

## 上传后的副作用
- 是否改变订单状态：未见状态字段变化（仍为可编辑草稿）
- 是否触发通知：本探测未观察通知渠道

## 安全建议
- 是否需要白名单：是，必须与 `OMS_WRITE_ALLOWLIST` 同类限制
- 是否可回滚：是，从 `vaAtomFiles` 去掉即可；FMS 上的对象未做物理删除

## 结论
- 能否上传：是
- 接入 pipeline 的工作量估计：FMS 签名直传 + `updateAtomDetails` 即可接入，约 1–2 天（含白名单、回滚、禁止 `vaOrderReview`）
