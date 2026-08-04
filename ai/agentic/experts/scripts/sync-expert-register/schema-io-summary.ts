/** 将 manifest 中的 JSON Schema 子集转为多维表格「io」列可读摘要 */

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_LINES = 80;
const DESC_MAX_LEN = 200;

export interface IoSummaryOptions {
  maxDepth?: number;
  maxLines?: number;
}

interface Ctx {
  lines: string[];
  maxLines: number;
  maxDepth: number;
  truncated: boolean;
}

/** input：每条 property 必标（必填）或（可选）；output：仅 required 标（必填） */
type CardinalitySection = "input" | "output";

function cardinalityMark(isReq: boolean, section: CardinalitySection): string {
  if (isReq) return "（必填）";
  if (section === "input") return "（可选）";
  return "";
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function truncateDesc(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= DESC_MAX_LEN) return t;
  return `${t.slice(0, DESC_MAX_LEN)}…`;
}

function descSuffix(schema: Record<string, unknown>): string {
  const d = schema.description;
  if (typeof d !== "string" || !d.trim()) return "";
  return ` — ${truncateDesc(d)}`;
}

function ensureRoom(ctx: Ctx): boolean {
  if (ctx.lines.length < ctx.maxLines) return true;
  if (!ctx.truncated) {
    ctx.lines.push("…（余下省略）");
    ctx.truncated = true;
  }
  return false;
}

/** 单行类型标签（不展开子属性时） */
function typeLabel(schema: Record<string, unknown>, depth: number, maxDepth: number): string {
  if (depth >= maxDepth) return "…";

  const explicitType = schema.type;
  const props = schema.properties;
  const hasProps = isPlainObject(props) && Object.keys(props).length > 0;

  if (explicitType === "string") return "string";
  if (explicitType === "number") return "number";
  if (explicitType === "integer") return "integer";
  if (explicitType === "boolean") return "boolean";

  if (explicitType === "array") {
    const items = schema.items;
    if (isPlainObject(items)) {
      if (items.type === "string") return "string[]";
      if (items.type === "number") return "number[]";
      if (items.type === "integer") return "integer[]";
      if (items.type === "boolean") return "boolean[]";
      if (items.type === "object" || (isPlainObject(items.properties) && Object.keys(items.properties).length > 0)) {
        return "object[]";
      }
      const inner = typeLabel(items, depth + 1, maxDepth);
      return inner === "object" || inner.endsWith("[]") ? `${inner.replace(/\[\]$/, "")}[]` : "array";
    }
    return "array";
  }

  if (explicitType === "object" || hasProps) {
    if (schema.additionalProperties === true && !hasProps) return "object（自由字段）";
    return "object";
  }

  return "any";
}

function appendConstraintIfAny(schema: Record<string, unknown>, indent: string, ctx: Ctx): void {
  const xc = schema.x_constraint;
  if (typeof xc !== "string" || !xc.trim()) return;
  if (!ensureRoom(ctx)) return;
  ctx.lines.push(`${indent}约束：${truncateDesc(xc)}`);
}

/** 编排器可读：框架顶层须与 inputs 一并满足的约定（不进入 inputSchema.properties） */
function appendXInvokeContract(schema: Record<string, unknown>, ctx: Ctx): void {
  const v = schema.x_invoke_contract;
  if (typeof v !== "string" || !v.trim()) return;
  if (!ensureRoom(ctx)) return;
  ctx.lines.push("");
  ctx.lines.push("x_invoke_contract（框架顶层，编排必看）:");
  for (const line of v.trim().split("\n")) {
    if (!ensureRoom(ctx)) return;
    const t = line.trimEnd();
    if (t) ctx.lines.push(t);
  }
}

function formatObjectBody(
  schema: Record<string, unknown>,
  indent: string,
  depth: number,
  ctx: Ctx,
  section: CardinalitySection
): void {
  const reqList = schema.required;
  const requiredKeys = Array.isArray(reqList) ? reqList.filter((x): x is string => typeof x === "string") : [];
  const propsRaw = schema.properties;

  if (!isPlainObject(propsRaw) || Object.keys(propsRaw).length === 0) {
    if (schema.additionalProperties === true) {
      if (ensureRoom(ctx)) ctx.lines.push(`${indent}（自由字段 object）`);
    } else if (ensureRoom(ctx)) {
      ctx.lines.push(`${indent}（无字段定义）`);
    }
    appendConstraintIfAny(schema, indent, ctx);
    return;
  }

  for (const key of Object.keys(propsRaw).sort()) {
    if (!ensureRoom(ctx)) return;
    const sub = propsRaw[key];
    const isReq = requiredKeys.includes(key);
    const mark = cardinalityMark(isReq, section);
    if (!isPlainObject(sub)) {
      ctx.lines.push(`${indent}- ${key}${mark}：any`);
      continue;
    }
    const suffix = descSuffix(sub);

    const canDeeper = depth < ctx.maxDepth;
    const subProps = sub.properties;
    const subHasProps = isPlainObject(subProps) && Object.keys(subProps).length > 0;
    const subType = sub.type;
    const isObjectExpand = canDeeper && (subType === "object" || (subHasProps && subType !== "array"));

    const items = sub.items;
    const itemsObj = isPlainObject(items) ? items : null;
    const itemsHasProps =
      itemsObj && isPlainObject(itemsObj.properties) && Object.keys(itemsObj.properties).length > 0;
    const isArrayOfObject =
      canDeeper &&
      subType === "array" &&
      itemsObj &&
      (itemsObj.type === "object" || itemsHasProps);

    if (isObjectExpand && subHasProps) {
      ctx.lines.push(`${indent}- ${key}${mark}：object${suffix}`);
      formatObjectBody(sub, `${indent}  `, depth + 1, ctx, section);
      continue;
    }

    if (isArrayOfObject && itemsObj) {
      ctx.lines.push(`${indent}- ${key}${mark}：object[]${suffix}`);
      formatObjectBody(itemsObj, `${indent}  `, depth + 1, ctx, section);
      continue;
    }

    ctx.lines.push(`${indent}- ${key}${mark}：${typeLabel(sub, depth, ctx.maxDepth)}${suffix}`);
  }

  appendConstraintIfAny(schema, indent, ctx);
}

function appendSchemaSection(schema: unknown, ctx: Ctx, section: CardinalitySection): void {
  if (!isPlainObject(schema)) {
    if (ensureRoom(ctx)) ctx.lines.push("（未定义）");
    return;
  }

  const hasProps = isPlainObject(schema.properties) && Object.keys(schema.properties).length > 0;
  const t = schema.type;
  if (t !== "object" && t !== undefined && !hasProps) {
    if (ensureRoom(ctx)) ctx.lines.push(`（非 object 根：type=${String(t)}）`);
    return;
  }

  if (!hasProps && schema.additionalProperties !== true && t === "object") {
    if (ensureRoom(ctx)) ctx.lines.push("（无 properties）");
    appendConstraintIfAny(schema, "", ctx);
    return;
  }

  if (!hasProps && schema.additionalProperties === true) {
    if (ensureRoom(ctx)) ctx.lines.push("object（自由字段）");
    appendConstraintIfAny(schema, "", ctx);
    return;
  }

  formatObjectBody(schema, "", 0, ctx, section);
}

/**
 * 生成写入多维表格「io」列的纯文本：input_schema / output_schema 两段，恒为非空字符串。
 */
export function buildIoSummary(
  inputSchema: unknown,
  outputSchema: unknown,
  options?: IoSummaryOptions
): string {
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxLines = options?.maxLines ?? DEFAULT_MAX_LINES;

  const ctx: Ctx = {
    lines: [],
    maxLines,
    maxDepth,
    truncated: false,
  };

  ctx.lines.push("input_schema:");
  appendSchemaSection(inputSchema, ctx, "input");
  if (isPlainObject(inputSchema)) {
    appendXInvokeContract(inputSchema, ctx);
  }

  ctx.lines.push("");
  ctx.lines.push("output_schema:");
  appendSchemaSection(outputSchema, ctx, "output");

  let out = ctx.lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();

  if (!out.trim()) {
    out = "input_schema:\n（未定义）\n\noutput_schema:\n（未定义）";
  }

  return out;
}
