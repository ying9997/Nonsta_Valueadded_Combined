# 附件链接探测

生成时间：2026-09-11T09:06:26.344Z
探测单：`VASC000000315774`（已知有标签文件）
Cookie：TOM 共享认证 `D:\DA\AI_EXPERT\TOM\共享认证\playwright_cookies.json`（经 `oms-tom-client.ts` 自动续期）

> 仅供探测，不改 pipeline。

## 结论（先看这里）

- **能不能下载：能。** 裸 FMS 直链会 401；必须走 OMS 代理 `/VasOrder/fmsFileDownload/?url=` + TOM Cookie。
- **链接格式：** `vaAtomFiles[].url` 常见两种：完整 `https://{us|eu|cn}fmsstream.winit.com.cn/{uuid}/YYYY/MM/DD/{file}`，或无域名的 objectURI（`{uuid}/YYYY/MM/DD/{file}`）。
- **鉴权：** FMS 直链无 token 时 401，Cookie 也没用；代理会 302 到带 `token=` 的签名 URL（有时效）。

## HTML 中找到的附件元素

### GET `/VasOrder/detail/orderNo/VASC000000315774`
- 状态：ok 422303 chars
- 元素类型：详情页是 SPA/模板页，附件列表不写死 `<a href>`，由 `vaAtomFiles` JSON 渲染
- 链接格式线索：`fmsHost=https://cnfmsstream.winit.com.cn uploadHost=`
- data-file-url：[]
- data-download：[]
- fmsstream 直链：[]
- fmsFileDownload 路径：[]
- inboundBatchDownloadFile：false
- 附件相关 DOM 线索：true
- download-like href：[]

### GET `/VasOrder/detail/isFill/Y/orderNo/VASC000000315774/isView/N`
- 状态：ok 422465 chars
- 元素类型：详情页是 SPA/模板页，附件列表不写死 `<a href>`，由 `vaAtomFiles` JSON 渲染
- 链接格式线索：`fmsHost=https://cnfmsstream.winit.com.cn uploadHost=`
- data-file-url：[]
- data-download：[]
- fmsstream 直链：[]
- fmsFileDownload 路径：[]
- inboundBatchDownloadFile：false
- 附件相关 DOM 线索：true
- download-like href：[]


### getVasList 返回的 vaAtomFiles（VASC000000315774）

| fileType | fileName | url |
| --- | --- | --- |
| - | Order (52).pdf | 2da4921a351948b6b6dcb090feb192fe/2026/07/14/cae35789d02740e4aedb6968cc92e56d.pdf |
| VAS_ATTR_REL_RDP | 048e14b500f14c45b957c7584de5ef15.JPEG | https://usfmsstream.winit.com.cn/bc519f8333df4e12b818860183eaec0f/2026/07/14/048e14b500f14c45b957c7584de5ef15.JPEG |

## API 探测

| API | 成功 | 返回什么 |
| --- | --- | --- |
| oms.VaOrderService_getVasList | 是 | content[1] keys=organizationId,createdby,created,updatedby,updated,isActive,isDelete,id,orderNo,winitOrderNo,winitProductCode,winitProductName |
| oms.VaOrderService_getVaAtomFileList | 否 | oms.VaOrderService_getVaAtomFileList 失败: oms.VaOrderService_getVaAtomFileList can't find! |
| oms.VaOrderFileService_queryPage | 否 | oms.VaOrderFileService_queryPage 失败: oms.VaOrderFileService_queryPage can't find! |
| oms.VaOrderService_queryVaAtomFile | 否 | oms.VaOrderService_queryVaAtomFile 失败: oms.VaOrderService_queryVaAtomFile can't find! |
| oms.VaAtomFileService_queryPage | 否 | oms.VaAtomFileService_queryPage 失败: oms.VaAtomFileService_queryPage can't find! |

## 示例链接（本轮实测）

- objectURI（无域名）：`2da4921a351948b6b6dcb090feb192fe/2026/07/14/cae35789d02740e4aedb6968cc92e56d.pdf`
- 拼完整 FMS：`https://usfmsstream.winit.com.cn/` + 上式
- 实际下载（TOM Cookie）：`https://cnomstom.winit.com.cn/VasOrder/fmsFileDownload/?url=` + URL 编码后的完整 FMS 地址
- 页面 `GlobalData.fms` 是 `https://cnfmsstream.winit.com.cn`，**不能**一律用它拼美国仓文件；按仓区试 `us` / `eu` / `cn`，OMS 代理会 302 到正确区域

## 文件存储位置

- 域名：`{us|eu|cn}fmsstream.winit.com.cn`（按仓区；中国 TOM 页 GlobalData.fms 常是 `cnfmsstream`，但美国仓附件实际在 `usfmsstream`）
- 鉴权方式：OMS Cookie → 代理签发 FMS token；裸链无签名不可下
- 仓库批量：页面另有 `POST /VasOrder/inboundBatchDownloadFile`（本探测未作为主路径）
