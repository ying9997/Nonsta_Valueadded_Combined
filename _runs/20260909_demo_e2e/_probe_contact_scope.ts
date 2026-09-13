import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { getToken } from "../../internal-review-copilot/lib/feishu-bot.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const token = await getToken();
  const res = await fetch("https://open.feishu.cn/open-apis/contact/v3/scopes?page_size=50&user_id_type=open_id", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const d = data.data || {};
  console.log(JSON.stringify({
    code: data.code,
    msg: data.msg,
    user_ids: d.user_ids || [],
    department_ids: d.department_ids || [],
    group_ids: d.group_ids || [],
    has_more: d.has_more,
    page_token: d.page_token || "",
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
