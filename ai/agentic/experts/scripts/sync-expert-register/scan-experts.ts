import * as fs from "fs";
import * as path from "path";

export interface ManifestJson {
  id: string;
  name?: string;
  description?: string;
  capabilities?: string[];
  version?: string;
  [key: string]: unknown;
}

export interface ExpertScanEntry {
  expertDirAbs: string;
  localRepoPath: string;
  manifest: ManifestJson;
}

function* walkExpertDirs(expertsRoot: string): Generator<string> {
  const stack = [expertsRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "_template") continue;
        stack.push(p);
      }
    }
    yield dir;
  }
}

/** 列出含 manifest.json 的专家目录（跳过 experts/_template 子树） */
export function scanExperts(repoRoot: string): ExpertScanEntry[] {
  const expertsRoot = path.join(repoRoot, "experts");
  if (!fs.existsSync(expertsRoot)) {
    throw new Error(`未找到 experts 目录: ${expertsRoot}`);
  }
  const out: ExpertScanEntry[] = [];
  for (const dir of walkExpertDirs(expertsRoot)) {
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    const raw = fs.readFileSync(manifestPath, "utf-8");
    let manifest: ManifestJson;
    try {
      manifest = JSON.parse(raw) as ManifestJson;
    } catch (e) {
      throw new Error(`无效 manifest.json: ${manifestPath}: ${e instanceof Error ? e.message : e}`);
    }
    const id = String(manifest.id ?? "").trim();
    if (!id) {
      throw new Error(`manifest 缺少 id: ${manifestPath}`);
    }
    const localRepoPath = path.relative(repoRoot, dir).replace(/\\/g, "/");
    out.push({ expertDirAbs: dir, localRepoPath, manifest });
  }
  out.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  return out;
}
