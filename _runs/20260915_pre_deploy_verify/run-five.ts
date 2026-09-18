import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { projectDir } from "../../internal-review-copilot/lib/env.ts";

const ORDERS = [
  "VASC000000366717",
  "VASC000000366735",
  "VASC000000366432",
  "VASC000000368331",
  "VASC000000368313",
];
const GAP_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function runDemo(orderNo: string): Promise<number> {
  const root = projectDir();
  return new Promise((resolvePromise) => {
    const child = spawn(
      "npx",
      [
        "tsx",
        "internal-review-copilot/scripts/demo-e2e.ts",
        "--input",
        "_runs/20260915_pre_deploy_verify/details.json",
        "--order",
        orderNo,
        "--send-feishu",
        "--card",
        "--out",
        "_runs/20260915_pre_deploy_verify",
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          OMS_WRITE_ENABLED: "0",
          FEISHU_TEST_CHAT_ID: "oc_80b07f38ed6833df3787a97a496f1097",
        },
        shell: true,
        windowsHide: true,
      },
    );
    child.on("exit", (code) => resolvePromise(code ?? 1));
  });
}

async function main(): Promise<void> {
  const codes: Record<string, number> = {};
  for (let i = 0; i < ORDERS.length; i += 1) {
    const orderNo = ORDERS[i];
    console.log(`\n===== ${i + 1}/5 ${orderNo} =====`);
    codes[orderNo] = await runDemo(orderNo);
    if (i < ORDERS.length - 1) {
      console.log(`wait ${GAP_MS / 1000}s before next Feishu send`);
      await sleep(GAP_MS);
    }
  }
  console.log(JSON.stringify({ codes, out: resolve(projectDir(), "_runs/20260915_pre_deploy_verify") }, null, 2));
  if (Object.values(codes).some((code) => code !== 0)) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
