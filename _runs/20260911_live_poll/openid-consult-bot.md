# 增值咨询 Bot 重查 open_id（2026-09-11）

应用：`cli_aa2a76198a7adcb3`（profile `zengzhi-consult`）
测试群：`oc_80b07f38ed6833df3787a97a496f1097`

| 姓名 | 查法 | consult-bot open_id | 测试群 |
|------|------|---------------------|--------|
| 金萤 | 邮箱 `ying.jin@winit.com` + 群成员 | `ou_d09d7409a63201462177f4d8a8b1ac7b` | 在 |
| 耿文文 | 群成员名匹配（邮箱通讯录不可见） | `ou_fb036b896ab183f3eea939470e47bf66` | 在 |
| 何静 | 增值沟通群能看到人，Bot 通讯录 41050；拉测试群 invalid_id | **空** | 不在 |
| 李颖 | 同上 | **空** | 不在 |

说明：

- 禁止回填综合解决方案 ID（李颖 `ou_d5829bcb…`、何静 `ou_92cc10dc…`），@ 会失效。
- 增值咨询 Bot 通讯录目前只对金萤有可见性；拉何静/李颖进测试群返回 `invalid_id_list`。
- 她们进测试群后，再按群成员姓名回填 consult-bot open_id，CC 才能真 @。
