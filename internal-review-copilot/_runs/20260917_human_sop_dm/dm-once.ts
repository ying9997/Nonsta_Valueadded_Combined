import { loadEnvFiles } from "../../lib/env.ts";
import { notifyOwnerHumanSopFilled } from "../../lib/human-sop-alert.ts";

loadEnvFiles();
const result = await notifyOwnerHumanSopFilled({
  vascNo: "VASC000000370947",
  customer: "绍兴市博炜伞业有限公司",
  warehouse: "DEBR2 Warehouse",
  error: "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。",
});
console.log(`human_sop_dm_once ${result}`);
