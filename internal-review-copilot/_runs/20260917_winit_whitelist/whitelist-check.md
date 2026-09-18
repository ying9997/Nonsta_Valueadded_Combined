# 白名单核对（通讯录截图 × 异常沟通群）

对照你给的通讯录：

| 截图位置 | 含义 | 对应 tenant_key | 异常沟通群人数 |
|---|---|---|---|
| 组织内联系人 → 万邑通 | 万邑通飞书员工 | `136f0a06630e975e` | 188 |
| 关联组织 → Winit → US / UK / AU / DE / System Account | 同一家 Winit Lark 企业下的地区/系统账号 | `10b2a3f0fdc79759` | 63 |
| 关联组织里的 Zhirong Mai | **人**，不是组织 | 群内「麦植荣」已在飞书那个 key | 1（算在 188 里） |

群里只出现这两个企业，没有第三家。US/UK/AU/DE 在飞书通讯录是 Winit 下面的下级，不是 5 个独立 tenant，所以白名单只写 2 个 key。

63 人姓名（英文/海外同事为主，和关联组织对得上），抽样：Willie Lam、Aleksandar Yovkov、Katarzyna Swiatek、Florentin Fieraru、Marcelo Alexandre Ribeiro Lopez、Mohamad Nouredin Kazan、Zha.Xinge、蕭凱文、王婉清。

## 怎么用

禁止使用、巡检告警共用 `config/winit-tenant-whitelist.json`。

- 单聊：对方企业不在上面 2 个 key → 回复「禁止使用」（拿不到企业标识也禁止）
- 群里 @机器人：群成员里只要有非万邑通，或名单拉不全 → 回复「禁止使用」
- 【增值】异常沟通：251 人全在白名单内，**非万邑通 = 0**；飞书仍标 `external=true`，巡检表里群类型是「外部」但外部人数是 0

未把 System Account / Zhirong Mai 写成单独企业。
