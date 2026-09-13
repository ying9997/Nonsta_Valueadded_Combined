# 附件下载探测报告

生成时间：2026-09-10T21:24:28

## 附件链接格式
- 详情页 `vaAtomFiles[].url` / 属性 JSON 里的 `fileUrl`
- 直链示例：`https://usfmsstream.winit.com.cn/{uuid}/YYYY/MM/DD/{file}`
- OMS 代理：`https://cnomstom.winit.com.cn/VasOrder/fmsFileDownload/?url=` + URL 编码
- 异常单页同类代理：`/UnusualEvent/fmsFileDownload/?url=`
- 仓库批量：`POST /VasOrder/inboundBatchDownloadFile`（`fileData` JSON）

## 鉴权方式
- FMS 直链（无 token）：401，Cookie 也没用
- OMS 代理 `VasOrder/fmsFileDownload`：TOM Cookie 即可；会 302 到带 `token=` 的 FMS 签名 URL（有时效）
- 给 LLM 用：先走 OMS 代理拿二进制，不要直接打裸 FMS 链

## 下载测试
| 附件类型 | 文件名 | 大小 | Cookie | 下载成功 | 内容可读 |
|---------|--------|------|--------|---------|---------|
| text/html-or-json | 048e14b500f14c45b957c7584de5ef15.JPEG | 142 | True | 401 | 否 |
| text/html-or-json | 048e14b500f14c45b957c7584de5ef15.JPEG | 142 | False | 401 | 否 |
| image/jpeg | 048e14b500f14c45b957c7584de5ef15.JPEG | 129869 | True | 200 | 是 |
| text/html-or-json | 9a62da67b8f44a90833555341c1f3b00.JPEG | 142 | True | 401 | 否 |
| text/html-or-json | 9a62da67b8f44a90833555341c1f3b00.JPEG | 142 | False | 401 | 否 |
| image/jpeg | 9a62da67b8f44a90833555341c1f3b00.JPEG | 158128 | True | 200 | 是 |
| text/html-or-json | fa771549078a413f81bfa36bd89d5f95.JPEG | 142 | True | 401 | 否 |
| text/html-or-json | fa771549078a413f81bfa36bd89d5f95.JPEG | 142 | False | 401 | 否 |
| image/jpeg | fa771549078a413f81bfa36bd89d5f95.JPEG | 157493 | True | 200 | 是 |

## 后续接入 LLM 的可行性
- 图片附件：下载成功后可走多模态 LLM，或本地 OCR（Tesseract）；中文标签准确率需抽样
- PDF 附件：pdf-parse / 多模态
- Excel 附件：openpyxl / pandas；需确认 FMS 是否给到 xlsx 二进制

## 结论
- 能否下载：是
- 可读样本数：3 / 9
- 接入 LLM 的工作量估计：下载链路已通，主要工作是按类型解析并控制体积
