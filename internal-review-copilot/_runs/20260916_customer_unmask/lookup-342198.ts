import { loadEnvFiles } from "../../lib/env.ts";
import { lookupCustomerName } from "../../lib/oms-customer.ts";

loadEnvFiles();
const name = await lookupCustomerName("VASC000000342198", "19104098");
console.log(JSON.stringify({ orderNo: "VASC000000342198", customerCode: "19104098", name }, null, 2));
if (!name || /\*/.test(name) || name.includes("脱敏")) {
  throw new Error(`lookup still masked or empty: ${name}`);
}
