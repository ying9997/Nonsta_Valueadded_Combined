import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { getToken } from "../../internal-review-copilot/lib/feishu-bot.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const token = await getToken();
  const openId = "ou_d09d7409a63201462177f4d8a8b1ac7b";
  const res = await fetch(
    `https://open.feishu.cn/open-apis/contact/v3/users/${openId}?user_id_type=open_id`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2).slice(0, 6000));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
