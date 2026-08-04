import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  unlink
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const REPORT_RELATIVE_PATHS = {
  "kb:inventory": "data/generated/reports/kb-inventory-report.json",
  "kb:validate": "data/generated/reports/kb-validate-report.json",
  "kb:generate": "data/generated/reports/kb-generate-report.json",
  "kb:index": "data/generated/reports/kb-index-report.json",
  "kb:coverage": "data/generated/reports/kb-coverage-report.json",
  "kb:test": "data/generated/reports/kb-test-report.json",
  "kb:build-release": "data/generated/reports/kb-build-release-report.json",
  "kb:verify-release": "data/generated/reports/kb-verify-release-report.json"
};
export const REPORT_RELATIVE_PATH = REPORT_RELATIVE_PATHS["kb:validate"];
export const REPORT_SCHEMA_REFERENCE = "../../schemas/command-report.schema.json";
export const CONTRACT_VERSION = "0.1.0";
export const TOOL_VERSION = "0.1.0";

const REPORT_DIRECTORY = "data/generated/reports";
const AUTHORITY_EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);
const PHASE0_MARKER_FILES = new Set(["README.md", ".gitignore", ".gitkeep"]);

const BUSINESS_CONTENT_ROOTS = [
  "data/canonical/entities",
  "data/canonical/relationships",
  "data/canonical/vocabularies",
  "data/extracted",
  "data/generated",
  "domain",
  "entities",
  "glossary",
  "relationship-mappings",
  "source-references/extracts",
  "source-references/snapshots"
];

export function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export function isPathInsideProject(absolutePath) {
  const relative = path.relative(PROJECT_ROOT, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function reportPathForCommand(command) {
  return REPORT_RELATIVE_PATHS[command] || REPORT_RELATIVE_PATH;
}

function isExcludedAuthorityPath(relativePath, entryName, isDirectory) {
  const normalized = toPosixPath(relativePath);
  if (isDirectory && AUTHORITY_EXCLUDED_DIRECTORIES.has(entryName)) {
    return true;
  }
  return normalized === REPORT_DIRECTORY || normalized.startsWith(`${REPORT_DIRECTORY}/`);
}

async function collectAuthorityEntries(absoluteDirectory, relativeDirectory, entries) {
  const directoryEntries = await readdir(absoluteDirectory, { withFileTypes: true });
  directoryEntries.sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of directoryEntries) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    if (isExcludedAuthorityPath(relativePath, entry.name, entry.isDirectory())) {
      continue;
    }

    const absolutePath = path.join(absoluteDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      entries.push({ kind: "symlink", path: relativePath, digest: sha256("symlink") });
      continue;
    }
    if (entry.isDirectory()) {
      entries.push({ kind: "directory", path: relativePath, digest: sha256("directory") });
      await collectAuthorityEntries(absolutePath, relativePath, entries);
      continue;
    }
    if (entry.isFile()) {
      const content = await readFile(absolutePath);
      entries.push({ kind: "file", path: relativePath, digest: sha256(content) });
    }
  }
}

export async function computeAuthorityDigest() {
  const entries = [];
  await collectAuthorityEntries(PROJECT_ROOT, "", entries);
  entries.sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path, "en");
    return pathOrder || left.kind.localeCompare(right.kind, "en");
  });
  const canonical = entries
    .map((entry) => `${entry.kind}\0${entry.path}\0${entry.digest}`)
    .join("\n");
  return sha256(canonical);
}

async function categoryContainsBusinessContent(relativeRoot) {
  const absoluteRoot = path.resolve(PROJECT_ROOT, ...relativeRoot.split("/"));
  let stat;
  try {
    stat = await lstat(absoluteRoot);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return true;
  }

  const pending = [absoluteRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = toPosixPath(path.relative(PROJECT_ROOT, absolutePath));
      if (relativePath === REPORT_DIRECTORY || relativePath.startsWith(`${REPORT_DIRECTORY}/`)) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        return true;
      }
      if (entry.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }
      if (!entry.isFile() || !PHASE0_MARKER_FILES.has(entry.name)) {
        return true;
      }
    }
  }
  return false;
}

export async function detectPhase0BusinessContent() {
  const categories = [];
  for (const relativeRoot of BUSINESS_CONTENT_ROOTS) {
    if (await categoryContainsBusinessContent(relativeRoot)) {
      categories.push(relativeRoot);
    }
  }
  return categories.sort((left, right) => left.localeCompare(right, "en"));
}

export function readStartedFromCommit() {
  const result = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000
  });
  if (result.status !== 0) {
    return null;
  }
  const commit = String(result.stdout || "").trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(commit) ? commit : null;
}

function sortForJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortForJson);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right, "en"))) {
      sorted[key] = sortForJson(value[key]);
    }
    return sorted;
  }
  return value;
}

function containsUnsafeReportText(serialized) {
  const slash = String.fromCharCode(47);
  const backslash = String.fromCharCode(92);
  const fileScheme = ["file:", slash, slash].join("");
  const localRoots = ["home", "Users", "tmp"].map(
    (segment) => `${slash}${segment}${slash}`
  );
  if (serialized.toLowerCase().includes(fileScheme)) {
    return true;
  }
  if (serialized.includes(backslash + backslash)) {
    return true;
  }
  for (let index = 0; index + 2 < serialized.length; index += 1) {
    const previous = index > 0 ? serialized[index - 1] : "";
    if (
      /[A-Za-z]/.test(serialized[index]) &&
      (!previous || !/[A-Za-z0-9]/.test(previous)) &&
      serialized[index + 1] === ":" &&
      (serialized[index + 2] === slash || serialized[index + 2] === backslash)
    ) {
      return true;
    }
  }
  return localRoots.some((root) => serialized.includes(root));
}

export async function writeCommandReport(report, relativeReportPath = REPORT_RELATIVE_PATH) {
  const reportPath = path.resolve(PROJECT_ROOT, ...relativeReportPath.split("/"));
  if (!isPathInsideProject(reportPath)) {
    throw new Error("REPORT_PATH_OUTSIDE_PROJECT");
  }

  const reportParent = path.dirname(reportPath);
  const parentStat = await lstat(reportParent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("REPORT_DIRECTORY_INVALID");
  }
  const [realProjectRoot, realReportParent] = await Promise.all([
    realpath(PROJECT_ROOT),
    realpath(reportParent)
  ]);
  const realParentRelative = path.relative(realProjectRoot, realReportParent);
  if (realParentRelative.startsWith("..") || path.isAbsolute(realParentRelative)) {
    throw new Error("REPORT_DIRECTORY_OUTSIDE_PROJECT");
  }
  try {
    const existingReport = await lstat(reportPath);
    if (!existingReport.isFile() || existingReport.isSymbolicLink()) {
      throw new Error("REPORT_TARGET_INVALID");
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  const serialized = `${JSON.stringify(sortForJson(report), null, 2)}\n`;
  if (containsUnsafeReportText(serialized)) {
    throw new Error("REPORT_CONTAINS_UNSAFE_TEXT");
  }

  const suffix = randomBytes(6).toString("hex");
  const temporaryPath = path.join(reportParent, `.command-report-${process.pid}-${suffix}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, reportPath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export function createSummary(checks, errors, warnings) {
  return {
    total_checks: checks.length,
    passed_checks: checks.filter((check) => check.status === "passed").length,
    failed_checks: checks.filter((check) => check.status === "failed").length,
    skipped_checks: checks.filter((check) => check.status === "skipped").length,
    error_count: errors.length,
    warning_count: warnings.length
  };
}

export function sortReportItems(items) {
  return [...items].sort((left, right) => {
    const leftKey = [left.code || left.check_id || "", left.path || "", left.line || 0, left.column || 0].join("\0");
    const rightKey = [right.code || right.check_id || "", right.path || "", right.line || 0, right.column || 0].join("\0");
    return leftKey.localeCompare(rightKey, "en");
  });
}

export function safeEvidencePath(relativePath) {
  const normalized = toPosixPath(relativePath);
  if (
    normalized &&
    !normalized.startsWith("../") &&
    !path.posix.isAbsolute(normalized) &&
    /^[A-Za-z0-9._/-]+$/.test(normalized)
  ) {
    return normalized;
  }
  return `_redacted-paths/${sha256(normalized).slice(0, 16)}`;
}
