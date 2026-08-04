import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  CONTRACT_VERSION,
  PROJECT_ROOT,
  REPORT_RELATIVE_PATH,
  REPORT_SCHEMA_REFERENCE,
  TOOL_VERSION,
  computeAuthorityDigest,
  createSummary,
  detectPhase0BusinessContent,
  isPathInsideProject,
  readStartedFromCommit,
  safeEvidencePath,
  sha256,
  sortReportItems,
  toPosixPath,
  writeCommandReport
} from "./lib/command-report.mjs";

const EXPECTED_NODE_VERSION = "24.16.0";
const EXPECTED_NPM_VERSION = "11.13.0";
const EXPECTED_NODE_RANGE = ">=24.16.0 <25";

const EXPECTED_SCRIPTS = {
  "kb:inventory": "node scripts/kb-command-stub.mjs kb:inventory",
  "kb:validate": "node scripts/kb-validate.mjs",
  "kb:generate": "node scripts/kb-command-stub.mjs kb:generate",
  "kb:index": "node scripts/kb-command-stub.mjs kb:index",
  "kb:coverage": "node scripts/kb-command-stub.mjs kb:coverage",
  "kb:test": "node scripts/kb-command-stub.mjs kb:test",
  "kb:build-release": "node scripts/kb-command-stub.mjs kb:build-release",
  "kb:verify-release": "node scripts/kb-command-stub.mjs kb:verify-release"
};

const REQUIRED_ROOT_FILES = [
  ".gitattributes",
  ".gitignore",
  ".nvmrc",
  "AGENTS.md",
  "CHANGELOG.md",
  "DECISIONS.md",
  "README.md",
  "ROADMAP.md",
  "SCHEMA.md",
  "VERSION",
  "index.md",
  "log.md",
  "package-lock.json",
  "package.json"
];

const REQUIRED_RULE_FILES = [
  "rules/coding.md",
  "rules/delivery.md",
  "rules/knowledge-governance.md",
  "rules/project-progress.md",
  "rules/reasoning.md",
  "rules/release.md",
  "rules/source-migration.md",
  "rules/subagents.md",
  "rules/text-processing.md",
  "rules/validation.md"
];

const REQUIRED_SCRIPT_FILES = [
  "scripts/kb-command-stub.mjs",
  "scripts/kb-validate.mjs",
  "scripts/lib/command-report.mjs"
];

const DOMAIN_DIRECTORIES = [
  "domain",
  "domain/order-entry",
  "domain/warehouse-fulfillment",
  "domain/packing-and-handover",
  "domain/carrier-fulfillment",
  "domain/tracking-and-delivery",
  "domain/exceptions-and-inquiry",
  "domain/proof-of-delivery",
  "domain/claims-and-dispositions",
  "domain/sla-and-fees"
];

const ENTITY_DIRECTORIES = [
  "entities",
  "entities/scenarios",
  "entities/order-types",
  "entities/lifecycle-stages",
  "entities/warehouse-tasks",
  "entities/statuses",
  "entities/tracking-events",
  "entities/exceptions",
  "entities/resolution-actions",
  "entities/packaging-modes",
  "entities/delivery-products",
  "entities/carriers",
  "entities/inquiry-rules",
  "entities/pod-rules",
  "entities/claim-rules",
  "entities/failed-delivery-disposition-rules",
  "entities/sla-rules",
  "entities/fee-rules",
  "entities/vasc-products",
  "entities/value-added-service-items",
  "entities/config-fields",
  "entities/api-references"
];

const REQUIRED_DIRECTORIES = [
  ...DOMAIN_DIRECTORIES,
  ...ENTITY_DIRECTORIES,
  "data",
  "data/canonical",
  "data/canonical/entities",
  "data/canonical/relationships",
  "data/canonical/vocabularies",
  "data/extracted",
  "data/generated",
  "data/generated/reports",
  "data/schemas",
  "dist",
  "glossary",
  "relationship-mappings",
  "releases",
  "rules",
  "scripts",
  "source-references",
  "source-references/extracts",
  "source-references/reports",
  "source-references/snapshots",
  "templates",
  "tests",
  "tests/answer-assembly",
  "tests/boundaries",
  "tests/fixtures",
  "tests/retrieval"
];

const REQUIRED_README_DIRECTORIES = [
  ...DOMAIN_DIRECTORIES,
  ...ENTITY_DIRECTORIES,
  "data",
  "glossary",
  "relationship-mappings",
  "releases",
  "scripts",
  "source-references",
  "templates",
  "tests"
];

const REQUIRED_PHASE0_DATA_FILES = [
  "data/canonical/generation-metadata.json",
  "data/schemas/command-report.schema.json",
  "data/schemas/generation-metadata.schema.json",
  "data/schemas/source-registry.schema.json",
  "data/canonical/entities/.gitkeep",
  "data/canonical/relationships/.gitkeep",
  "data/canonical/vocabularies/.gitkeep",
  "data/extracted/.gitkeep",
  "data/generated/reports/.gitignore",
  "dist/.gitignore",
  "source-references/extracts/.gitkeep",
  "source-references/reports/.gitkeep",
  "source-references/snapshots/.gitkeep",
  "tests/answer-assembly/.gitkeep",
  "tests/boundaries/.gitkeep",
  "tests/fixtures/.gitkeep",
  "tests/retrieval/.gitkeep",
  "source-references/source-registry.json"
];

const REQUIRED_TEMPLATE_FILES = [
  "templates/command-report-template.json",
  "templates/fact-record-template.json",
  "templates/generated-page-metadata-template.md",
  "templates/relationship-record-template.json",
  "templates/source-record-template.json"
];

const STRUCTURE_TEMPLATE_CONTRACTS = new Map([
  ["templates/fact-record-template.json", "business-knowledge"],
  ["templates/relationship-record-template.json", "business-knowledge"],
  ["templates/source-record-template.json", "source-snapshot"]
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".csv",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".txt",
  ".yaml",
  ".yml"
]);

const ROOT_NAME_EXCEPTIONS = new Set([
  ".gitattributes",
  ".gitignore",
  ".nvmrc",
  "AGENTS.md",
  "CHANGELOG.md",
  "DECISIONS.md",
  "README.md",
  "ROADMAP.md",
  "SCHEMA.md",
  "VERSION"
]);

function locationForIndex(text, index) {
  const before = text.slice(0, index);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isInsideWebUrl(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const tokenStart = Math.max(
    lineStart,
    text.lastIndexOf(" ", index - 1) + 1,
    text.lastIndexOf("\t", index - 1) + 1,
    text.lastIndexOf("\"", index - 1) + 1,
    text.lastIndexOf("'", index - 1) + 1
  );
  const prefix = text.slice(tokenStart, index).toLowerCase();
  return prefix.includes(":" + String.fromCharCode(47) + String.fromCharCode(47));
}

function findForbiddenPathMatches(text) {
  const matches = [];
  const slash = String.fromCharCode(47);
  const backslash = String.fromCharCode(92);
  const tilde = String.fromCharCode(126);

  for (let index = 0; index + 2 < text.length; index += 1) {
    const first = text[index];
    const second = text[index + 1];
    const third = text[index + 2];
    const previous = index > 0 ? text[index - 1] : "";
    if (
      /[A-Za-z]/.test(first) &&
      (!previous || !/[A-Za-z0-9]/.test(previous)) &&
      second === ":" &&
      (third === slash || third === backslash)
    ) {
      matches.push({ code: "LOCAL_WINDOWS_PATH", index, value: text.slice(index, index + 3) });
    }
  }

  const uncPrefix = backslash + backslash;
  let uncIndex = text.indexOf(uncPrefix);
  while (uncIndex !== -1) {
    const next = text[uncIndex + uncPrefix.length] || "";
    const previous = uncIndex > 0 ? text[uncIndex - 1] : "";
    if (/[A-Za-z0-9]/.test(next) && (!previous || /[\s"'(=]/.test(previous))) {
      matches.push({ code: "LOCAL_UNC_PATH", index: uncIndex, value: uncPrefix + next });
    }
    uncIndex = text.indexOf(uncPrefix, uncIndex + uncPrefix.length);
  }

  const fileScheme = ["file:", slash, slash].join("");
  let fileIndex = text.toLowerCase().indexOf(fileScheme);
  while (fileIndex !== -1) {
    matches.push({ code: "LOCAL_FILE_URI", index: fileIndex, value: fileScheme });
    fileIndex = text.toLowerCase().indexOf(fileScheme, fileIndex + fileScheme.length);
  }

  const localRoots = ["home", "Users", "tmp", "private"].map(
    (segment) => `${slash}${segment}${slash}`
  );
  for (const root of localRoots) {
    let rootIndex = text.indexOf(root);
    while (rootIndex !== -1) {
      if (!isInsideWebUrl(text, rootIndex)) {
        matches.push({ code: "LOCAL_POSIX_PATH", index: rootIndex, value: root });
      }
      rootIndex = text.indexOf(root, rootIndex + root.length);
    }
  }

  for (const prefix of [`${tilde}${slash}`, `${tilde}${backslash}`]) {
    let homeIndex = text.indexOf(prefix);
    while (homeIndex !== -1) {
      matches.push({ code: "LOCAL_HOME_PATH", index: homeIndex, value: prefix });
      homeIndex = text.indexOf(prefix, homeIndex + prefix.length);
    }
  }

  return matches;
}

function findSensitiveMatches(text) {
  const matches = [];
  const privateKeyMarker = ["BEGIN", "PRIVATE", "KEY"].join(" ");
  let markerIndex = text.toUpperCase().indexOf(privateKeyMarker);
  while (markerIndex !== -1) {
    matches.push({ code: "POSSIBLE_PRIVATE_KEY", index: markerIndex, value: privateKeyMarker });
    markerIndex = text.toUpperCase().indexOf(privateKeyMarker, markerIndex + privateKeyMarker.length);
  }

  const credentialNames = [
    "access[_-]?token",
    "api[_-]?key",
    "authorization",
    "client[_-]?secret",
    "password",
    "refresh[_-]?token"
  ].join("|");
  const assignmentPattern = new RegExp(
    `(?:${credentialNames})\\s*[:=]\\s*[\"']?([A-Za-z0-9_./+=-]{16,})`,
    "gi"
  );
  for (const match of text.matchAll(assignmentPattern)) {
    const value = match[1] || match[0];
    if (!/^(?:example|placeholder|redacted)/i.test(value)) {
      matches.push({ code: "POSSIBLE_CREDENTIAL", index: match.index, value });
    }
  }

  const bearerPattern = new RegExp(
    ["bear", "er\\s+[A-Za-z0-9_./+=-]{16,}"].join(""),
    "gi"
  );
  for (const match of text.matchAll(bearerPattern)) {
    matches.push({ code: "POSSIBLE_BEARER_CREDENTIAL", index: match.index, value: match[0] });
  }

  const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
  for (const match of text.matchAll(jwtPattern)) {
    matches.push({ code: "POSSIBLE_JWT", index: match.index, value: match[0] });
  }
  return matches;
}

function isTextPath(relativePath) {
  const baseName = path.posix.basename(relativePath);
  return (
    TEXT_EXTENSIONS.has(path.posix.extname(baseName).toLowerCase()) ||
    ROOT_NAME_EXCEPTIONS.has(baseName) ||
    baseName === ".gitkeep"
  );
}

async function walkProject() {
  const results = [];
  const pending = [{ absolute: PROJECT_ROOT, relative: "" }];
  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current.absolute, { withFileTypes: true });
    entries.sort((left, right) => right.name.localeCompare(left.name, "en"));
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      const relative = current.relative ? `${current.relative}/${entry.name}` : entry.name;
      if (
        relative.startsWith("data/generated/reports/") &&
        entry.name !== ".gitignore"
      ) {
        continue;
      }
      const absolute = path.join(current.absolute, entry.name);
      results.push({ absolute, relative, entry });
      if (entry.isDirectory() && entry.name !== "dist") {
        pending.push({ absolute, relative });
      }
    }
  }
  return results.sort((left, right) => left.relative.localeCompare(right.relative, "en"));
}

function validPortableName(name, isRoot) {
  if (isRoot && ROOT_NAME_EXCEPTIONS.has(name)) {
    return true;
  }
  if (name === "README.md" || name === ".gitignore" || name === ".gitkeep") {
    return true;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(name);
}

function normalizedAbsolute(value) {
  const normalized = path.normalize(path.resolve(value));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function runGit(args, cwd = PROJECT_ROOT) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000
  });
}

function readNpmVersion() {
  const userAgent = process.env.npm_config_user_agent || "";
  const match = userAgent.match(/(?:^|\s)npm\/([^\s]+)/);
  if (match) {
    return match[1];
  }
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(executable, ["--version"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000
  });
  return result.status === 0 ? String(result.stdout || "").trim() : null;
}

function parseMarkdownTargets(text) {
  const targets = [];
  const pattern = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;
  for (const match of text.matchAll(pattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.includes(">")) {
      target = target.slice(1, target.indexOf(">"));
    } else {
      const titleStart = target.search(/\s+["']/);
      if (titleStart !== -1) {
        target = target.slice(0, titleStart);
      }
    }
    targets.push({ target, index: match.index + match[0].indexOf(match[1]) });
  }
  return targets;
}

function isExternalLink(target) {
  return /^(?:https?|mailto):/i.test(target);
}

async function pathExists(relativePath, expectedType) {
  const absolutePath = path.resolve(PROJECT_ROOT, ...relativePath.split("/"));
  try {
    const stat = await lstat(absolutePath);
    if (stat.isSymbolicLink()) {
      return { exists: false, symbolicLink: true };
    }
    if (expectedType === "file") {
      return { exists: stat.isFile(), symbolicLink: false };
    }
    return { exists: stat.isDirectory(), symbolicLink: false };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, symbolicLink: false };
    }
    throw error;
  }
}

function createRecorder() {
  const checks = [];
  const errors = [];
  const warnings = [];
  const issueKeys = new Set();

  function addCheck(checkId, status, message, relativePath) {
    const normalizedCheckId = checkId.replace(/[^A-Za-z0-9._-]/g, "-");
    const check = { check_id: normalizedCheckId, status, message };
    if (relativePath) {
      check.path = safeEvidencePath(relativePath);
    }
    checks.push(check);
  }

  function addIssue(target, issue) {
    const normalized = { ...issue };
    if (normalized.path) {
      normalized.path = safeEvidencePath(normalized.path);
    }
    const key = [
      normalized.code,
      normalized.path || "",
      normalized.line || 0,
      normalized.column || 0,
      normalized.fingerprint || ""
    ].join("\0");
    if (!issueKeys.has(key)) {
      issueKeys.add(key);
      target.push(normalized);
    }
  }

  return {
    checks,
    errors,
    warnings,
    addCheck,
    addError: (issue) => addIssue(errors, issue),
    addWarning: (issue) => addIssue(warnings, issue)
  };
}

async function validateRequiredStructure(recorder) {
  const requiredFiles = [
    ...REQUIRED_ROOT_FILES,
    ...REQUIRED_RULE_FILES,
    ...REQUIRED_SCRIPT_FILES,
    ...REQUIRED_PHASE0_DATA_FILES,
    ...REQUIRED_TEMPLATE_FILES,
    ...REQUIRED_README_DIRECTORIES.map((directory) => `${directory}/README.md`)
  ];

  for (const relativePath of [...new Set(requiredFiles)].sort((left, right) => left.localeCompare(right, "en"))) {
    const result = await pathExists(relativePath, "file");
    const status = result.exists ? "passed" : "failed";
    recorder.addCheck(`required-file:${relativePath}`, status, result.exists ? "必需文件存在。" : "必需文件缺失或类型错误。", relativePath);
    if (!result.exists) {
      recorder.addError({
        code: result.symbolicLink ? "REQUIRED_FILE_IS_SYMLINK" : "REQUIRED_FILE_MISSING",
        message: "必需文件缺失、类型错误或使用了符号链接。",
        path: relativePath
      });
    }
  }

  for (const relativePath of [...new Set(REQUIRED_DIRECTORIES)].sort((left, right) => left.localeCompare(right, "en"))) {
    const result = await pathExists(relativePath, "directory");
    const status = result.exists ? "passed" : "failed";
    recorder.addCheck(`required-directory:${relativePath}`, status, result.exists ? "必需目录存在。" : "必需目录缺失或类型错误。", relativePath);
    if (!result.exists) {
      recorder.addError({
        code: result.symbolicLink ? "REQUIRED_DIRECTORY_IS_SYMLINK" : "REQUIRED_DIRECTORY_MISSING",
        message: "必需目录缺失、类型错误或使用了符号链接。",
        path: relativePath
      });
    }
  }

  return requiredFiles;
}

async function validateFiles(recorder) {
  const entries = await walkProject();
  const decodedText = new Map();
  const parsedJson = new Map();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  for (const item of entries) {
    const name = path.posix.basename(item.relative);
    const isRoot = !item.relative.includes("/");
    if (!validPortableName(name, isRoot)) {
      recorder.addCheck(`portable-name:${item.relative}`, "failed", "文件或目录名不符合可迁移命名规则。", item.relative);
      recorder.addError({ code: "NON_PORTABLE_NAME", message: "文件或目录名不符合命名规则。", path: item.relative });
    }

    if (item.entry.isSymbolicLink()) {
      recorder.addCheck(`symlink:${item.relative}`, "failed", "项目内不允许符号链接或目录联接。", item.relative);
      recorder.addError({ code: "SYMLINK_NOT_ALLOWED", message: "项目内符号链接可能逃逸项目根。", path: item.relative });
      continue;
    }
    if (!item.entry.isFile() || !isTextPath(item.relative)) {
      continue;
    }

    let text;
    try {
      const buffer = await readFile(item.absolute);
      text = decoder.decode(buffer);
    } catch {
      recorder.addCheck(`utf8:${item.relative}`, "failed", "文本文件不是有效 UTF-8。", item.relative);
      recorder.addError({ code: "INVALID_UTF8", message: "文本文件不是有效 UTF-8。", path: item.relative });
      continue;
    }
    decodedText.set(item.relative, text);

    if (text.charCodeAt(0) === 0xfeff) {
      recorder.addError({ code: "UTF8_BOM_NOT_ALLOWED", message: "文本文件包含不需要的 BOM。", path: item.relative });
    }
    if (text.includes("\r")) {
      recorder.addError({ code: "NON_LF_LINE_ENDING", message: "文本文件必须使用 LF 换行。", path: item.relative });
    }

    for (const match of findForbiddenPathMatches(text)) {
      const location = locationForIndex(text, match.index);
      recorder.addError({
        code: match.code,
        message: "检测到禁止进入正式项目的本机路径形态。",
        path: item.relative,
        line: location.line,
        column: location.column,
        fingerprint: fingerprint(match.value)
      });
    }
    for (const match of findSensitiveMatches(text)) {
      const location = locationForIndex(text, match.index);
      recorder.addError({
        code: match.code,
        message: "检测到疑似凭证或敏感材料；报告未保留原文。",
        path: item.relative,
        line: location.line,
        column: location.column,
        fingerprint: fingerprint(match.value)
      });
    }

    if (path.posix.extname(item.relative).toLowerCase() === ".json") {
      try {
        parsedJson.set(item.relative, JSON.parse(text));
      } catch {
        recorder.addError({ code: "INVALID_JSON", message: "JSON 无法解析。", path: item.relative });
      }
    }
  }

  recorder.addCheck(
    "portable-names",
    recorder.errors.some((error) => error.code === "NON_PORTABLE_NAME") ? "failed" : "passed",
    "已检查文件和目录命名。"
  );
  recorder.addCheck(
    "utf8-and-line-endings",
    recorder.errors.some((error) => ["INVALID_UTF8", "UTF8_BOM_NOT_ALLOWED", "NON_LF_LINE_ENDING"].includes(error.code)) ? "failed" : "passed",
    "已检查文本编码和换行。"
  );
  recorder.addCheck(
    "absolute-path-scan",
    recorder.errors.some((error) => error.code.startsWith("LOCAL_")) ? "failed" : "passed",
    "已执行 Phase 0 本机路径扫描。"
  );
  recorder.addCheck(
    "sensitive-content-scan",
    recorder.errors.some((error) => error.code.startsWith("POSSIBLE_")) ? "failed" : "passed",
    "已执行高置信敏感信息扫描。"
  );

  return { decodedText, parsedJson };
}

async function validateMarkdownLinks(recorder, decodedText) {
  let failed = false;
  for (const [relativePath, text] of [...decodedText.entries()].sort((left, right) => left[0].localeCompare(right[0], "en"))) {
    if (path.posix.extname(relativePath).toLowerCase() !== ".md") {
      continue;
    }
    for (const item of parseMarkdownTargets(text)) {
      const rawTarget = item.target;
      if (!rawTarget || rawTarget.startsWith("#") || isExternalLink(rawTarget)) {
        continue;
      }
      const location = locationForIndex(text, item.index);
      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(rawTarget);
      } catch {
        decodedTarget = rawTarget;
      }
      const pathOnly = decodedTarget.split("#", 1)[0].split("?", 1)[0];
      if (!pathOnly) {
        continue;
      }
      if (path.isAbsolute(pathOnly) || path.win32.isAbsolute(pathOnly) || pathOnly.startsWith(String.fromCharCode(126))) {
        failed = true;
        recorder.addError({
          code: "MARKDOWN_ABSOLUTE_LINK",
          message: "Markdown 本地链接必须使用项目内相对路径。",
          path: relativePath,
          line: location.line,
          column: location.column,
          fingerprint: fingerprint(rawTarget)
        });
        continue;
      }

      const sourceDirectory = path.dirname(path.resolve(PROJECT_ROOT, ...relativePath.split("/")));
      const targetPath = path.resolve(sourceDirectory, pathOnly);
      if (!isPathInsideProject(targetPath)) {
        failed = true;
        recorder.addError({
          code: "MARKDOWN_LINK_ESCAPES_PROJECT",
          message: "Markdown 链接解析后逃逸项目根。",
          path: relativePath,
          line: location.line,
          column: location.column,
          fingerprint: fingerprint(rawTarget)
        });
        continue;
      }
      try {
        const stat = await lstat(targetPath);
        if (stat.isSymbolicLink()) {
          throw new Error("SYMLINK");
        }
      } catch {
        failed = true;
        recorder.addError({
          code: "MARKDOWN_LINK_TARGET_MISSING",
          message: "Markdown 项目内链接目标不存在或是符号链接。",
          path: relativePath,
          line: location.line,
          column: location.column,
          fingerprint: fingerprint(rawTarget)
        });
      }
    }
  }
  recorder.addCheck("markdown-links", failed ? "failed" : "passed", "已检查 Markdown 项目内链接和越界。" );
}

async function validateJsonSchemas(recorder, parsedJson) {
  let failed = false;
  for (const [relativePath, value] of [...parsedJson.entries()].sort((left, right) => left[0].localeCompare(right[0], "en"))) {
    if (relativePath === "package.json" || relativePath === "package-lock.json") {
      continue;
    }
    if (STRUCTURE_TEMPLATE_CONTRACTS.has(relativePath)) {
      const expectedProfile = STRUCTURE_TEMPLATE_CONTRACTS.get(relativePath);
      const templateValid = Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.$comment === "string" &&
        value.$comment.trim() &&
        value.template_version === "0.1.0" &&
        value.template_profile === expectedProfile &&
        value.record &&
        typeof value.record === "object" &&
        !Array.isArray(value.record)
      );
      if (!templateValid) {
        failed = true;
        recorder.addError({
          code: "STRUCTURE_TEMPLATE_INVALID",
          message: "结构模板缺少必要的模板元数据或 record 对象。",
          path: relativePath
        });
      }
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.$schema !== "string" || !value.$schema.trim()) {
      failed = true;
      recorder.addError({ code: "JSON_SCHEMA_IDENTIFIER_MISSING", message: "Phase 0 JSON 缺少有效的 Schema 标识。", path: relativePath });
      continue;
    }
    const schemaReference = value.$schema.trim();
    if (/^https?:/i.test(schemaReference)) {
      continue;
    }
    if (path.isAbsolute(schemaReference) || path.win32.isAbsolute(schemaReference)) {
      failed = true;
      recorder.addError({ code: "JSON_SCHEMA_PATH_NOT_RELATIVE", message: "项目 Schema 引用必须使用项目内相对路径。", path: relativePath });
      continue;
    }
    const sourceDirectory = path.dirname(path.resolve(PROJECT_ROOT, ...relativePath.split("/")));
    const schemaPath = path.resolve(sourceDirectory, schemaReference);
    if (!isPathInsideProject(schemaPath)) {
      failed = true;
      recorder.addError({ code: "JSON_SCHEMA_PATH_ESCAPES_PROJECT", message: "Schema 引用逃逸项目根。", path: relativePath });
      continue;
    }
    try {
      const stat = await lstat(schemaPath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error("INVALID_SCHEMA_TARGET");
      }
    } catch {
      failed = true;
      recorder.addError({ code: "JSON_SCHEMA_TARGET_MISSING", message: "Schema 引用目标不存在或类型错误。", path: relativePath });
    }
  }
  recorder.addCheck("json-schema-identifiers", failed ? "failed" : "passed", "已检查 Phase 0 JSON 的 Schema 标识。" );
}

function validatePackageContract(recorder, parsedJson, decodedText) {
  const packageJson = parsedJson.get("package.json");
  let packageValid = Boolean(packageJson);
  if (packageJson) {
    packageValid = packageValid && packageJson.name === "outbound-fulfillment-guide";
    packageValid = packageValid && packageJson.version === "0.0.0";
    packageValid = packageValid && packageJson.private === true;
    packageValid = packageValid && packageJson.type === "module";
    packageValid = packageValid && packageJson.engines?.node === EXPECTED_NODE_RANGE;
    packageValid = packageValid && packageJson.packageManager === `npm@${EXPECTED_NPM_VERSION}`;
    packageValid = packageValid && JSON.stringify(packageJson.scripts) === JSON.stringify(EXPECTED_SCRIPTS);
    for (const dependencyField of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      packageValid = packageValid && (!packageJson[dependencyField] || Object.keys(packageJson[dependencyField]).length === 0);
    }
  }
  recorder.addCheck("package-contract", packageValid ? "passed" : "failed", "已检查 package.json 的 Phase 0 命令和运行时契约。", "package.json");
  if (!packageValid) {
    recorder.addError({ code: "PACKAGE_CONTRACT_INVALID", message: "package.json 与 Phase 0 固定契约不一致。", path: "package.json" });
  }

  const nvmVersion = (decodedText.get(".nvmrc") || "").trim();
  const nvmValid = nvmVersion === EXPECTED_NODE_VERSION;
  recorder.addCheck("nvm-version", nvmValid ? "passed" : "failed", "已检查固定 Node.js 版本。", ".nvmrc");
  if (!nvmValid) {
    recorder.addError({ code: "NVM_VERSION_MISMATCH", message: "固定 Node.js 版本不符合 Phase 0 契约。", path: ".nvmrc" });
  }

  const runtimeNodeValid = process.versions.node === EXPECTED_NODE_VERSION;
  recorder.addCheck("runtime-node-version", runtimeNodeValid ? "passed" : "failed", "已检查当前 Node.js 运行时版本。" );
  if (!runtimeNodeValid) {
    recorder.addError({ code: "NODE_RUNTIME_VERSION_MISMATCH", message: "当前 Node.js 版本不符合固定基线。" });
  }

  const npmVersion = readNpmVersion();
  const npmValid = npmVersion === EXPECTED_NPM_VERSION;
  recorder.addCheck("runtime-npm-version", npmValid ? "passed" : "failed", "已检查当前 npm 版本。" );
  if (!npmValid) {
    recorder.addError({ code: "NPM_RUNTIME_VERSION_MISMATCH", message: "当前 npm 版本不符合固定基线。" });
  }

  const lockJson = parsedJson.get("package-lock.json");
  const lockValid = Boolean(
    lockJson &&
    lockJson.name === "outbound-fulfillment-guide" &&
    lockJson.version === "0.0.0" &&
    lockJson.lockfileVersion === 3 &&
    lockJson.packages?.[""]?.name === "outbound-fulfillment-guide" &&
    lockJson.packages?.[""]?.version === "0.0.0" &&
    lockJson.packages?.[""]?.engines?.node === EXPECTED_NODE_RANGE
  );
  recorder.addCheck("package-lock-contract", lockValid ? "passed" : "failed", "已检查 package-lock.json 与包契约的一致性。", "package-lock.json");
  if (!lockValid) {
    recorder.addError({ code: "PACKAGE_LOCK_INVALID", message: "锁文件缺失、无法解析或与包契约不一致。", path: "package-lock.json" });
  }
}

function validatePhase0Data(recorder, parsedJson) {
  const registry = parsedJson.get("source-references/source-registry.json");
  const registryEmpty = Boolean(
    registry &&
    registry.$schema === "../data/schemas/source-registry.schema.json" &&
    registry.schema_version === "0.1.0" &&
    Array.isArray(registry.sources) &&
    registry.sources.length === 0
  );
  recorder.addCheck("empty-source-registry", registryEmpty ? "passed" : "failed", "已检查 Phase 0 来源台账为空。", "source-references/source-registry.json");
  if (!registryEmpty) {
    recorder.addError({ code: "SOURCE_REGISTRY_NOT_EMPTY", message: "Phase 0 来源台账必须为空。", path: "source-references/source-registry.json" });
  }

  const generationMetadata = parsedJson.get("data/canonical/generation-metadata.json");
  const generationEpochValid = Boolean(
    generationMetadata &&
    Number.isInteger(generationMetadata.generation_epoch) &&
    generationMetadata.generation_epoch >= 0 &&
    generationMetadata.generation_epoch <= 253402300799
  );
  const expectedGeneratedAt = generationEpochValid
    ? new Date(generationMetadata.generation_epoch * 1000).toISOString().replace(".000Z", "Z")
    : null;
  const metadataValid = Boolean(
    generationEpochValid &&
    generationMetadata.$schema === "../schemas/generation-metadata.schema.json" &&
    generationMetadata.schema_version === "0.1.0" &&
    generationMetadata.validation_profile === "phase0-skeleton" &&
    generationMetadata.business_content_status === "empty" &&
    generationMetadata.generated_at === expectedGeneratedAt
  );
  recorder.addCheck("generation-metadata", metadataValid ? "passed" : "failed", "已检查受控生成时间元数据。", "data/canonical/generation-metadata.json");
  if (!metadataValid) {
    recorder.addError({ code: "GENERATION_METADATA_INVALID", message: "受控生成时间元数据缺失或不合法。", path: "data/canonical/generation-metadata.json" });
  }
}

async function validateAgentRuleReferences(recorder, decodedText) {
  const agentsText = decodedText.get("AGENTS.md") || "";
  let failed = false;
  for (const relativePath of REQUIRED_RULE_FILES) {
    const referenced = agentsText.includes(`](${relativePath})`);
    const exists = (await pathExists(relativePath, "file")).exists;
    if (!referenced || !exists) {
      failed = true;
      recorder.addError({
        code: !referenced ? "AGENTS_RULE_REFERENCE_MISSING" : "AGENTS_RULE_TARGET_MISSING",
        message: "AGENTS.md 的必需规则引用缺失或目标不存在。",
        path: relativePath
      });
    }
  }
  recorder.addCheck("agents-rule-references", failed ? "failed" : "passed", "已检查 AGENTS.md 的规则引用。", "AGENTS.md");
}

async function validateGit(recorder, requiredFiles) {
  let gitRootValid = false;
  const rootResult = runGit(["rev-parse", "--show-toplevel"]);
  if (rootResult.status === 0) {
    const reportedRoot = String(rootResult.stdout || "").trim();
    gitRootValid = normalizedAbsolute(reportedRoot) === normalizedAbsolute(PROJECT_ROOT);
  }
  recorder.addCheck("git-project-root", gitRootValid ? "passed" : "failed", "已检查项目使用独立本地 Git 根。" );
  if (!gitRootValid) {
    recorder.addError({ code: "GIT_ROOT_INVALID", message: "项目尚未初始化独立 Git，或 Git 根不等于项目根。" });
  }

  const parentResult = runGit(["rev-parse", "--show-toplevel"], path.dirname(PROJECT_ROOT));
  const parentIsRepository = parentResult.status === 0;
  recorder.addCheck("git-parent-boundary", parentIsRepository ? "failed" : "passed", "已检查父级目录没有统一 Git 仓库。" );
  if (parentIsRepository) {
    recorder.addError({ code: "PARENT_GIT_REPOSITORY_PRESENT", message: "父级知识库目录不应成为统一 Git 仓库。" });
  }

  let remoteValid = false;
  if (gitRootValid) {
    const remoteResult = runGit(["remote"]);
    remoteValid = remoteResult.status === 0;
  }
  recorder.addCheck("git-remotes", remoteValid ? "passed" : "failed", "已检查 Git remote 状态可读；校验报告不回显 remote 名称或 URL。" );
  if (!remoteValid) {
    recorder.addError({ code: "GIT_REMOTE_UNREADABLE", message: "无法读取 Git remote 状态。" });
  }

  let reportIgnored = false;
  if (gitRootValid) {
    const ignoreResult = runGit(["check-ignore", "--quiet", "--", REPORT_RELATIVE_PATH]);
    reportIgnored = ignoreResult.status === 0;
  }
  recorder.addCheck("command-report-ignored", reportIgnored ? "passed" : "failed", "已检查运行报告不会进入 Git。", REPORT_RELATIVE_PATH);
  if (!reportIgnored) {
    recorder.addError({ code: "COMMAND_REPORT_NOT_IGNORED", message: "命令报告路径必须被 Git 忽略。", path: REPORT_RELATIVE_PATH });
  }

  const startedFromCommit = readStartedFromCommit();
  let cloneReady = false;
  if (!startedFromCommit) {
    recorder.addCheck("git-initial-commit", "skipped", "当前没有初始提交，因此不能声称新 clone 可复现。" );
    recorder.addWarning({ code: "GIT_HEAD_MISSING", message: "当前没有初始提交；clone_ready 保持 false。" });
  } else if (gitRootValid) {
    const treeResult = runGit(["ls-tree", "-r", "--name-only", "HEAD"]);
    const tracked = new Set(
      treeResult.status === 0
        ? String(treeResult.stdout || "").split(/\r?\n/).filter(Boolean).map((item) => toPosixPath(item))
        : []
    );
    const requiredTracked = [...new Set(requiredFiles)].sort((left, right) => left.localeCompare(right, "en"));
    const missingTracked = requiredTracked.filter((item) => !tracked.has(item));
    const statusResult = runGit(["status", "--porcelain", "--untracked-files=all"]);
    const clean = statusResult.status === 0 && String(statusResult.stdout || "").trim() === "";
    cloneReady = missingTracked.length === 0 && clean;
    recorder.addCheck("git-clone-completeness", cloneReady ? "passed" : "failed", "已检查当前提交包含必需文件且工作树干净。" );
    if (!cloneReady) {
      recorder.addError({ code: "GIT_CLONE_NOT_REPRODUCIBLE", message: "当前提交未包含全部必需文件，或工作树仍有变更。" });
    }
  }

  return { startedFromCommit, cloneReady };
}

async function writeInvalidInvocationReport() {
  const digestBefore = await computeAuthorityDigest();
  const businessCategories = await detectPhase0BusinessContent();
  const digestAfter = await computeAuthorityDigest();
  const checks = [{ check_id: "command-arguments", status: "failed", message: "kb:validate 不接受 Phase 0 参数。" }];
  const errors = [{ code: "INVALID_ARGUMENTS", message: "命令参数无效；参数原值未记录。" }];
  const warnings = [];
  const report = {
    $schema: REPORT_SCHEMA_REFERENCE,
    contract_version: CONTRACT_VERSION,
    command: "kb:validate",
    tool_version: TOOL_VERSION,
    input_digest: digestBefore,
    started_from_commit: readStartedFromCommit(),
    status: "invalid_invocation",
    exit_code: 2,
    validation_profile: "phase0-skeleton",
    business_content_status: businessCategories.length > 0 ? "non_empty" : "empty",
    full_business_validation_available: false,
    clone_ready: false,
    release_ready: false,
    summary: createSummary(checks, errors, warnings),
    checks,
    errors,
    warnings,
    written_paths: [REPORT_RELATIVE_PATH],
    mutation_guard: {
      authoritative_inputs_modified: digestBefore !== digestAfter,
      business_outputs_written: false,
      allowed_report_path: REPORT_RELATIVE_PATH,
      input_digest_before: digestBefore,
      input_digest_after: digestAfter
    }
  };
  await writeCommandReport(report);
  process.stdout.write(`INVALID_INVOCATION kb:validate report=${REPORT_RELATIVE_PATH}\n`);
  process.exitCode = 2;
}

async function main() {
  if (process.argv.length > 2) {
    await writeInvalidInvocationReport();
    return;
  }

  const digestBefore = await computeAuthorityDigest();
  const recorder = createRecorder();
  const requiredFiles = await validateRequiredStructure(recorder);
  const { decodedText, parsedJson } = await validateFiles(recorder);
  await validateMarkdownLinks(recorder, decodedText);
  await validateJsonSchemas(recorder, parsedJson);
  validatePackageContract(recorder, parsedJson, decodedText);
  validatePhase0Data(recorder, parsedJson);
  await validateAgentRuleReferences(recorder, decodedText);

  const businessCategories = await detectPhase0BusinessContent();
  if (businessCategories.length === 0) {
    recorder.addCheck("phase0-empty-business-boundary", "passed", "未检测到超出 Phase 0 的业务内容。" );
  } else {
    for (const category of businessCategories) {
      recorder.addCheck(`phase0-scope:${category}`, "failed", "检测到超出 Phase 0 validator 能力的业务内容。", category);
      recorder.addError({
        code: "VALIDATOR_SCOPE_EXCEEDED",
        message: "检测到业务 Canonical、来源材料或生成业务视图；Phase 0 validator 拒绝继续声称通过。",
        path: category
      });
    }
  }

  const gitState = await validateGit(recorder, requiredFiles);
  const digestAfter = await computeAuthorityDigest();
  const authorityChanged = digestBefore !== digestAfter;
  if (authorityChanged) {
    recorder.addCheck("mutation-guard", "failed", "校验期间权威输入发生变化，结果不可采信。" );
    recorder.addError({ code: "AUTHORITY_CHANGED_DURING_VALIDATION", message: "校验期间权威输入摘要发生变化。" });
  } else {
    recorder.addCheck("mutation-guard", "passed", "校验器未修改权威输入。" );
  }

  const checks = sortReportItems(recorder.checks);
  const errors = sortReportItems(recorder.errors);
  const warnings = sortReportItems(recorder.warnings);
  let status = errors.length > 0 ? "failed" : "passed";
  let exitCode = errors.length > 0 ? 1 : 0;
  if (authorityChanged) {
    status = "internal_error";
    exitCode = 70;
  }
  const report = {
    $schema: REPORT_SCHEMA_REFERENCE,
    contract_version: CONTRACT_VERSION,
    command: "kb:validate",
    tool_version: TOOL_VERSION,
    input_digest: digestBefore,
    started_from_commit: gitState.startedFromCommit,
    status,
    exit_code: exitCode,
    validation_profile: "phase0-skeleton",
    business_content_status: businessCategories.length > 0 ? "non_empty" : "empty",
    full_business_validation_available: false,
    clone_ready: gitState.cloneReady,
    release_ready: false,
    summary: createSummary(checks, errors, warnings),
    checks,
    errors,
    warnings,
    written_paths: [REPORT_RELATIVE_PATH],
    mutation_guard: {
      authoritative_inputs_modified: authorityChanged,
      business_outputs_written: false,
      allowed_report_path: REPORT_RELATIVE_PATH,
      input_digest_before: digestBefore,
      input_digest_after: digestAfter
    }
  };

  await writeCommandReport(report);
  process.stdout.write(`${status.toUpperCase()} kb:validate profile=phase0-skeleton release_ready=false report=${REPORT_RELATIVE_PATH}\n`);
  process.exitCode = exitCode;
}

async function writeInternalErrorReport() {
  let digest;
  try {
    digest = await computeAuthorityDigest();
  } catch {
    digest = sha256("authority-digest-unavailable");
  }
  const errors = [{ code: "INTERNAL_ERROR", message: "Phase 0 validator 发生内部错误；未记录异常 stack。" }];
  const checks = [{ check_id: "validator-execution", status: "failed", message: "Validator 未能完成全部检查。" }];
  const warnings = [];
  const report = {
    $schema: REPORT_SCHEMA_REFERENCE,
    contract_version: CONTRACT_VERSION,
    command: "kb:validate",
    tool_version: TOOL_VERSION,
    input_digest: digest,
    started_from_commit: readStartedFromCommit(),
    status: "internal_error",
    exit_code: 70,
    validation_profile: "phase0-skeleton",
    business_content_status: "non_empty",
    full_business_validation_available: false,
    clone_ready: false,
    release_ready: false,
    summary: createSummary(checks, errors, warnings),
    checks,
    errors,
    warnings,
    written_paths: [REPORT_RELATIVE_PATH],
    mutation_guard: {
      authoritative_inputs_modified: true,
      business_outputs_written: false,
      allowed_report_path: REPORT_RELATIVE_PATH,
      input_digest_before: digest,
      input_digest_after: digest
    }
  };
  await writeCommandReport(report);
}

main().catch(async () => {
  await writeInternalErrorReport().catch(() => undefined);
  process.stderr.write("INTERNAL_ERROR kb:validate code=VALIDATOR_EXECUTION_FAILED\n");
  process.exitCode = 70;
});
