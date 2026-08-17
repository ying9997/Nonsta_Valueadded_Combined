/**
 * 将专家目录（manifest.json + workflow.json + nodes + prompts）导出为 COZE 工作流包结构。
 *
 * 用法:
 *   npx ts-node -P scripts/tsconfig.json scripts/expert-to-coze-cli.ts <expertDir> [--out <dir>] [--validate] [--no-zip]
 *
 * 默认写入 <expertDir>/workflow/MANIFEST.yml 与 <expertDir>/workflow/workflow/<yamlBasename>
 */

import * as fs from "fs";
import * as pathMod from "path";
import YAML from "yaml";
import {
  convertExpertDirToCoze,
  stringifyDraftWorkflowYml,
  stringifyManifestYml,
} from "./coze-export/emit";
import { loadCozeExportConfig } from "./coze-export/config";
import { zipCozeWorkflowPackage } from "./coze-export/zip-workflow";

const repoRoot = pathMod.resolve(__dirname, "..");
const cozeZipOutputDir = pathMod.join(repoRoot, "experts_coze_output");

function parseArgs(argv: string[]): {
  expertDir: string;
  outRoot: string | null;
  validate: boolean;
  noZip: boolean;
} {
  const rest = argv.slice(2);
  let outRoot: string | null = null;
  const positional: string[] = [];
  let validate = false;
  let noZip = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--out") {
      outRoot = rest[++i] ?? "";
      continue;
    }
    if (a === "--validate") {
      validate = true;
      continue;
    }
    if (a === "--no-zip") {
      noZip = true;
      continue;
    }
    if (a.startsWith("--")) {
      throw new Error(`未知参数: ${a}`);
    }
    positional.push(a);
  }
  const expertDir = pathMod.resolve(positional[0] ?? "");
  return { expertDir, outRoot: outRoot ? pathMod.resolve(outRoot) : null, validate, noZip };
}

function writeExport(expertDir: string, outRoot: string) {
  const manifest = JSON.parse(
    fs.readFileSync(pathMod.join(expertDir, "manifest.json"), "utf-8")
  ) as { id: string };
  const { manifestDoc, draftDoc } = convertExpertDirToCoze(expertDir);
  const config = loadCozeExportConfig(expertDir, manifest.id);

  const workflowRoot = pathMod.join(outRoot, "workflow");
  const inner = pathMod.join(workflowRoot, "workflow");
  fs.mkdirSync(inner, { recursive: true });

  const yamlName = config.yamlBasename ?? `${manifest.id}-draft.yaml`;
  const manifestYaml = stringifyManifestYml(manifestDoc as Record<string, unknown>);
  const draftYaml = stringifyDraftWorkflowYml(draftDoc as Record<string, unknown>);

  fs.writeFileSync(pathMod.join(workflowRoot, "MANIFEST.yml"), manifestYaml, "utf-8");
  fs.writeFileSync(pathMod.join(inner, yamlName), draftYaml, "utf-8");

  console.log(`Wrote ${pathMod.join(workflowRoot, "MANIFEST.yml")}`);
  console.log(`Wrote ${pathMod.join(inner, yamlName)}`);
}

function edgeKey(e: { source_node: string; target_node: string }): string {
  return `${e.source_node}->${e.target_node}`;
}

function validateAgainstSample(expertDir: string): void {
  const manifest = JSON.parse(
    fs.readFileSync(pathMod.join(expertDir, "manifest.json"), "utf-8")
  ) as { id: string };
  const config = loadCozeExportConfig(expertDir, manifest.id);
  const yamlName = config.yamlBasename ?? `${manifest.id}-draft.yaml`;
  const expectedPath = pathMod.join(expertDir, "workflow", "workflow", yamlName);
  if (!fs.existsSync(expectedPath)) {
    console.warn(`--validate: 样本不存在，跳过: ${expectedPath}`);
    return;
  }

  const expected = YAML.parse(fs.readFileSync(expectedPath, "utf-8")) as Record<string, unknown>;
  const { draftDoc } = convertExpertDirToCoze(expertDir);
  const gen = draftDoc as Record<string, unknown>;

  const expNodes = expected.nodes as Record<string, unknown>[];
  const genNodes = gen.nodes as Record<string, unknown>[];
  if (expNodes.length !== genNodes.length) {
    throw new Error(`validate: nodes 数量不一致 期望 ${expNodes.length} 实际 ${genNodes.length}`);
  }

  const expEdges = (expected.edges as { source_node: string; target_node: string }[]).map(edgeKey).sort();
  const genEdges = (gen.edges as { source_node: string; target_node: string }[]).map(edgeKey).sort();
  if (expEdges.join("|") !== genEdges.join("|")) {
    throw new Error(`validate: edges 不一致\n期望 ${expEdges.join(", ")}\n实际 ${genEdges.join(", ")}`);
  }

  const byId = (nodes: Record<string, unknown>[]) =>
    new Map(nodes.map((n) => [String(n.id), n] as const));

  const expById = byId(expNodes);
  const genById = byId(genNodes);

  for (const id of expById.keys()) {
    const a = expById.get(id)!;
    const b = genById.get(id);
    if (!b) throw new Error(`validate: 缺少节点 id ${id}`);
    if (a.type !== b.type) throw new Error(`validate: 节点 ${id} type 期望 ${a.type} 实际 ${b.type}`);
    if (a.type === "code") {
      const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
      const ca = norm((a.parameters as Record<string, unknown>).code as string);
      const cb = norm((b.parameters as Record<string, unknown>).code as string);
      if (ca !== cb) {
        throw new Error(`validate: 节点 ${id} code 正文与样本不一致（长度 ${ca.length} vs ${cb.length}）`);
      }
    }
  }

  console.log("--validate: 节点数、边集、各 code 节点正文与样本一致。");
}

const { expertDir, outRoot, validate, noZip } = parseArgs(process.argv);

if (!expertDir || !fs.existsSync(pathMod.join(expertDir, "manifest.json"))) {
  console.error(
    "用法: ts-node scripts/expert-to-coze-cli.ts <expertDir> [--out <dir>] [--validate] [--no-zip]"
  );
  process.exit(1);
}

try {
  if (validate) {
    validateAgainstSample(expertDir);
  }
  writeExport(expertDir, outRoot ?? expertDir);
  if (!noZip) {
    const manifest = JSON.parse(
      fs.readFileSync(pathMod.join(expertDir, "manifest.json"), "utf-8")
    ) as { id: string };
    const workflowRoot = pathMod.join(outRoot ?? expertDir, "workflow");
    const zipName = `${manifest.id.replace(/[^a-zA-Z0-9._-]+/g, "_")}.zip`;
    const zipPath = pathMod.join(cozeZipOutputDir, zipName);
    zipCozeWorkflowPackage(workflowRoot, zipPath);
    console.log(`Wrote zip ${zipPath}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
