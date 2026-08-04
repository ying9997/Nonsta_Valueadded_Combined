/**
 * CLI: resolve coze_workflow_id from Feishu register, run POST /v1/workflow/run, optional expect assertions.
 *
 * Usage:
 *   npx ts-node -P scripts/tsconfig.json -r dotenv/config scripts/expert-online-test/cli.ts -- --fixture <path> [--expert-id <id>] [--release-id <id>] [--ver <ver>] [--dry-resolve]
 */

import * as fs from "fs";
import * as path from "path";
import { assertExpect } from "./assert-expect";
import { runExpertWorkflow } from "./coze-workflow-run";
import { resolveWorkflowIdForExpert } from "./registry";
import type { FixtureFile } from "./types";

function printErr(msg: string): void {
  console.error(msg);
}

function getArg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function loadFixture(fixturePath: string): FixtureFile {
  const abs = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Fixture 不存在: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf-8");
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Fixture 须为 JSON 对象");
  }
  const f = data as FixtureFile;
  if (!f.parameters || typeof f.parameters !== "object" || Array.isArray(f.parameters)) {
    throw new Error("Fixture 缺少 object 类型的 parameters");
  }
  return f;
}

function requireReleaseId(cliRelease: string | undefined): string {
  const fromEnv = (process.env.EXPERT_REGISTER_RELEASE_ID ?? "").trim();
  const rid = (cliRelease ?? fromEnv).trim();
  if (!rid) {
    throw new Error("缺少 release_id：请传 --release-id 或设置环境变量 EXPERT_REGISTER_RELEASE_ID");
  }
  return rid;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const fixturePath = getArg(argv, "--fixture");
  const expertIdArg = getArg(argv, "--expert-id");
  const releaseIdArg = getArg(argv, "--release-id");
  const verArg = getArg(argv, "--ver");
  const dryResolve = hasFlag(argv, "--dry-resolve");

  if (!dryResolve && !fixturePath) {
    printErr(
      "用法:\n" +
        "  npm run test:expert:online -- --fixture <path> [--expert-id <id>] [--release-id <id>] [--ver <ver>]\n" +
        "  npm run test:expert:online -- --expert-id <id> --release-id <id> [--ver <ver>] --dry-resolve\n" +
        "环境变量: EXPERT_REGISTER_RELEASE_ID（可被 --release-id 覆盖）、FEISHU_*、COZE_API_TOKEN 或 COZE_WORKFLOW_PAT"
    );
    process.exit(2);
  }

  const releaseId = requireReleaseId(releaseIdArg);

  let expertId = (expertIdArg ?? "").trim();
  let fixture: FixtureFile | null = null;

  if (fixturePath) {
    fixture = loadFixture(fixturePath);
    if (!expertId && fixture.expert_id) {
      expertId = String(fixture.expert_id).trim();
    }
  }

  if (dryResolve) {
    if (!expertId) {
      printErr("--dry-resolve 需要 --expert-id 或 fixture 内的 expert_id");
      process.exit(2);
    }
    const resolved = await resolveWorkflowIdForExpert(expertId, releaseId, verArg);
    if (!resolved) {
      printErr(`未在登记表中找到 expert_id=${expertId} release_id=${releaseId}（available=on, coze_workflow_id 非空）`);
      process.exit(1);
    }
    console.log(
      JSON.stringify(
        {
          expert_id: resolved.expert_id,
          ver: resolved.ver,
          coze_workflow_id: resolved.coze_workflow_id,
          release_id: resolved.release_id,
        },
        null,
        2
      )
    );
    return;
  }

  if (!fixturePath || !fixture) {
    printErr("缺少 --fixture");
    process.exit(2);
  }

  if (!expertId) {
    printErr("缺少 expert_id：请传 --expert-id 或在 fixture 根级设置 expert_id");
    process.exit(2);
  }

  if (fixture.expert_id !== undefined && String(fixture.expert_id).trim() !== expertId) {
    printErr(
      `fixture.expert_id (${String(fixture.expert_id)}) 与 --expert-id (${expertId}) 不一致`
    );
    process.exit(2);
  }

  const resolved = await resolveWorkflowIdForExpert(expertId, releaseId, verArg);
  if (!resolved) {
    printErr(`未在登记表中找到 expert_id=${expertId} release_id=${releaseId}`);
    process.exit(1);
  }

  console.log(`登记表: ver=${resolved.ver} workflow_id=${resolved.coze_workflow_id}`);

  const result = await runExpertWorkflow({
    workflowId: resolved.coze_workflow_id,
    parameters: fixture.parameters,
  });

  const expectErrs = assertExpect(result, fixture.expect);
  if (expectErrs.length > 0) {
    for (const e of expectErrs) printErr(`[expect] ${e}`);
    console.log(
      JSON.stringify(
        {
          structured: result.structured,
          analysis: result.analysis,
          outputContext: result.outputContext,
          execute_id: result.execute_id,
          debug_url: result.debug_url,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        coze_code: result.coze_code,
        outputContext: result.outputContext,
        execute_id: result.execute_id,
        debug_url: result.debug_url,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  printErr(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
