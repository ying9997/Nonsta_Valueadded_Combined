/**
 * CLI 入口：npm run dev:expert outbound-order-status -- --outboundOrderNos '["WO001"]' --customerIntent "查状态"
 */

import "dotenv/config";
import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

/** Runner 级参数：写入 process.env，供万邑通 Coze 代理节点读取（覆盖 .env） */
const RUNNER_ENV_FLAGS: Record<string, string> = {
  "--coze-winit-customer-code": "COZE_WINIT_CUSTOMER_CODE",
  "--coze-winit-username": "COZE_WINIT_USERNAME",
};

/**
 * argv = [expertId, ...可选 runner 标志..., 可选 '--', ...专家入参...]
 * runner 标志须出现在第一个 `--` 之前；专家入参在第一个 `--` 之后，或与现有一致（无 `--` 时 expertId 之后全是专家入参）。
 */
function parseRunnerEnvFlags(argv: string[]): { paramArgs: string[] } {
  let i = 1;
  while (i < argv.length) {
    const token = argv[i];
    if (token === "--") {
      i++;
      return { paramArgs: argv.slice(i) };
    }
    const envName = RUNNER_ENV_FLAGS[token];
    if (!envName) {
      return { paramArgs: argv.slice(i) };
    }
    const value = argv[i + 1];
    if (value === undefined || value === "--" || value.startsWith("--")) {
      console.error(`Missing value for ${token} (provide a non-flag string right after the flag).`);
      process.exit(1);
    }
    process.env[envName] = value;
    i += 2;
  }
  return { paramArgs: [] };
}

/** 兼容 shell 破坏 JSON 的情况，如 PowerShell 把 ["WO1"] 变成 [WO1] */
function coerceStringArrayArg(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  const s = value.trim();
  try {
    const p = JSON.parse(s) as unknown;
    if (Array.isArray(p)) {
      return p.map((x) => String(x).trim()).filter(Boolean);
    }
    // 纯数字跟踪号/单号：JSON.parse 会变成 number 并丢精度或变科学计数法，保留原文 s。
    if (typeof p === "number" && Number.isFinite(p) && /^\d+$/.test(s)) {
      return [s];
    }
    if (p != null && p !== "") {
      return [String(p)];
    }
    return [];
  } catch {
    const m = s.match(/^\s*\[(.*)\]\s*$/s);
    if (m) {
      const inner = m[1].trim();
      if (!inner) return [];
      return inner
        .split(",")
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    return s ? [s] : [];
  }
}

function parseArgs(args: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg.startsWith("--") && arg.length > 2) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        try {
          const parsed = JSON.parse(next);
          // 纯数字单号/单号类参数被 JSON.parse 成 number 会丢精度，且 coerceStringArrayArg 只接受 string/array → 会变成 []。
          const idLikeKeys = new Set([
            "orderIdentifiers",
            "trackingIds",
            "outboundOrderNos",
            "inboundOrderNos",
            "claimIds",
            "inquiryIds",
          ]);
          if (idLikeKeys.has(key) && typeof parsed === "number" && Number.isFinite(parsed)) {
            params[key] = next.trim();
          } else {
            params[key] = parsed;
          }
        } catch {
          params[key] = next;
        }
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  if ("outboundOrderNos" in params) {
    params.outboundOrderNos = coerceStringArrayArg(params.outboundOrderNos);
  }
  if ("orderIdentifiers" in params) {
    params.orderIdentifiers = coerceStringArrayArg(params.orderIdentifiers);
  }
  if ("trackingIds" in params) {
    params.trackingIds = coerceStringArrayArg(params.trackingIds);
  }
  if ("claimIds" in params) {
    params.claimIds = coerceStringArrayArg(params.claimIds);
  }
  if ("inquiryIds" in params) {
    params.inquiryIds = coerceStringArrayArg(params.inquiryIds);
  }
  if ("inboundOrderNos" in params) {
    params.inboundOrderNos = coerceStringArrayArg(params.inboundOrderNos);
  }
  return params;
}

async function main() {
  const argv = process.argv.slice(2);
  const expertId = argv[0];
  if (!expertId || expertId.startsWith("--")) {
    console.error("Usage: npm run dev:expert -- <expert-id> [--coze-winit-customer-code <code>] [--coze-winit-username <name>] [-- --key value ...]");
    console.error("Runner flags (before --) override .env: COZE_WINIT_CUSTOMER_CODE, COZE_WINIT_USERNAME.");
    console.error("Example: npm run dev:expert -- outbound-order-status -- --outboundOrderNos '[\"WO001\"]' --customerIntent \"查状态\"");
    console.error(
      "Example (switch account): npm run dev:expert -- delivery-status -- --coze-winit-customer-code MYCODE -- --coze-winit-username myuser -- --trackingIds '[\"T1\"]'"
    );
    process.exit(1);
  }

  const { paramArgs } = parseRunnerEnvFlags(argv);
  const initialParams = parseArgs(paramArgs);

  const projectRoot = path.resolve(__dirname, "..");
  const expertDir = findExpertDir(projectRoot, expertId);
  if (!expertDir) {
    console.error(`Expert not found: ${expertId}`);
    process.exit(1);
  }

  const resolvedExpertDir = path.resolve(projectRoot, expertDir);
  console.error(`Running expert: ${expertId} at ${resolvedExpertDir}`);
  console.error("Initial params:", JSON.stringify(initialParams, null, 2));

  try {
    const result = await runExpert({
      expertDir: resolvedExpertDir,
      initialParams,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
