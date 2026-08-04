interface RegistryRow {
    expert_id: string;
    /** 与飞书列 release_id 一致；按发布批次召回时使用 */
    release_id?: string;
    name?: string;
    detail?: string;
    runtime?: string;
    local_repo_path?: string;
    invoke_url?: string;
    coze_workflow_id?: string;
    /** manifest 列原始 JSON 文本（与单元格一致，便于排错） */
    manifest_json?: string;
    /** 解析后的完整 manifest 对象；解析失败时为 null */
    manifest?: Record<string, unknown> | null;
    /**
     * 入参 JSON Schema 的 LLM 可读文本；来源为表列 **inputSchema**（非 manifest）。
     */
    input_schema?: string;
    /**
     * 出参 JSON Schema 的 LLM 可读文本；来源为表列 **outputSchema**（非 manifest）。
     */
    output_schema?: string;
    manifest_parse_error?: string;
}

/** Coze 代码节点注入 */
interface Args {
    params: {
        expert_ids?: unknown;
        tenant_token?: string;
        /** 必填，与 experts_recaller/nodes/release-id.ts 中 release_id 保持一致 */
        release_id?: unknown;
    };
}

interface Output {
    experts_available: RegistryRow[];
    experts_planner_md: string;
}

/** 多维表格专家 ID 列名（与表字段一致） */
const EXPERT_ID_FIELD = "expert_id";

/** 仅召回「上架/可用」行；列值与飞书单选/复选选项文案一致（常见为 on） */
const AVAILABLE_FIELD = "available";

const RELEASE_ID_FIELD = "release_id";

/** 表内独立 JSON Schema 列（与 manifest 解耦） */
const SCHEMA_INPUT_FIELD = "inputSchema";
const SCHEMA_OUTPUT_FIELD = "outputSchema";

/** 单次 filter 中 or 条件过多可能触达上限，分块查询 */
const EXPERT_ID_FILTER_CHUNK = 40;

/**
 * 飞书记录里单元格常见为字符串，也可能是 [{ type: "text", text: "..." }] 或嵌套结构；
 * 直接用 String() 会得到 "[object Object]" 或空，导致误判无数据。
 */
function bitableCellToString(v: unknown): string {
    if (v === undefined || v === null) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return String(v).trim();
    }
    if (Array.isArray(v)) {
        if (v.length === 0) return "";
        const parts: string[] = [];
        for (const item of v) {
            if (item === null || item === undefined) continue;
            if (typeof item === "string") {
                parts.push(item);
                continue;
            }
            if (typeof item === "object" && item !== null && "text" in item) {
                const t = (item as { text?: unknown }).text;
                if (t !== undefined && t !== null) parts.push(String(t));
            }
        }
        return parts.join("").trim();
    }
    if (typeof v === "object" && v !== null && "text" in v) {
        return String((v as { text?: unknown }).text ?? "").trim();
    }
    /* 单选 / 多选等: { type, value: ["选项"] } */
    if (typeof v === "object" && v !== null && "value" in v) {
        const val = (v as { value?: unknown }).value;
        if (Array.isArray(val)) return val.map((x) => String(x)).join(",").trim();
        if (val !== undefined && val !== null) return String(val).trim();
    }
    return String(v).trim();
}

function parseExpertIds(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((x) => String(x).trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return [];
        try {
            const p = JSON.parse(s) as unknown;
            if (Array.isArray(p)) return p.map((x) => String(x).trim()).filter(Boolean);
        } catch {
            /* 非 JSON 时按分隔符拆 */
        }
        return s.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean);
    }
    return [];
}

function dedupePreserveOrder(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function buildExpertIdOrFilter(ids: string[]): Record<string, unknown> {
    return {
        conjunction: "or",
        conditions: ids.map((id) => ({
            field_name: EXPERT_ID_FIELD,
            operator: "is",
            value: [id],
        })),
    };
}

/**
 * 多维表嵌套 filter：expert_id 子条件 AND available is on [AND release_id is 指定值]。
 * 未传 releaseId 时不加 release_id 条件（兼容历史无批次列数据）。
 */
function buildRegistryRecordFilter(
    expertIdSubfilter: Record<string, unknown>,
    releaseId?: string
): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [
        {
            field_name: AVAILABLE_FIELD,
            operator: "is",
            value: ["on"],
        },
    ];
    const rid = releaseId?.trim();
    if (rid) {
        conditions.push({
            field_name: RELEASE_ID_FIELD,
            operator: "is",
            value: [rid],
        });
    }
    return {
        conjunction: "and",
        children: [
            expertIdSubfilter,
            {
                conjunction: "and",
                conditions,
            },
        ],
    };
}

/** 若 expected 有值，则单元格文本须与其完全一致 */
function isBitableReleaseIdMatch(fields: Record<string, unknown>, expected?: string): boolean {
    const want = expected?.trim();
    if (!want) return true;
    return bitableCellToString(fields[RELEASE_ID_FIELD]) === want;
}

/** 飞书勾选/开关列可能为 boolean；文案选项与 filter 一致时为 on */
function isBitableAvailableOn(fields: Record<string, unknown>): boolean {
    const raw = fields[AVAILABLE_FIELD];
    if (raw === true) return true;
    if (raw === false) return false;
    const s = bitableCellToString(raw);
    return s.toLowerCase() === "on";
}

function isProbablyFeishuRichTextSegment(o: Record<string, unknown>): boolean {
    if (typeof o.text !== "string") return false;
    const keys = Object.keys(o);
    return keys.every((k) => ["type", "text", "style", "link", "mention", "user_id"].includes(k));
}

function isRecord(u: unknown): u is Record<string, unknown> {
    return typeof u === "object" && u !== null && !Array.isArray(u);
}

/** 从 inputSchema / outputSchema 列解析 JSON 对象（字符串、富文本段、数组或对象） */
function parseBitableJsonObjectField(v: unknown): Record<string, unknown> | null {
    if (v === undefined || v === null) return null;
    if (isRecord(v)) {
        if (isProbablyFeishuRichTextSegment(v)) {
            const t = String(v.text).trim();
            if (!t) return null;
            try {
                const p = JSON.parse(t) as unknown;
                return isRecord(p) ? p : null;
            } catch {
                return null;
            }
        }
        return v;
    }
    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return null;
        try {
            const p = JSON.parse(s) as unknown;
            return isRecord(p) ? p : null;
        } catch {
            return null;
        }
    }
    if (Array.isArray(v)) {
        const s = bitableCellToString(v);
        if (!s.trim()) return null;
        try {
            const p = JSON.parse(s) as unknown;
            return isRecord(p) ? p : null;
        } catch {
            return null;
        }
    }
    return null;
}

function standaloneSchemaColumnsToLlmStrings(fields: Record<string, unknown>): Pick<RegistryRow, "input_schema" | "output_schema"> {
    const inObj =
        parseBitableJsonObjectField(fields[SCHEMA_INPUT_FIELD]) ??
        parseBitableJsonObjectField(fields.input_schema);
    const outObj =
        parseBitableJsonObjectField(fields[SCHEMA_OUTPUT_FIELD]) ??
        parseBitableJsonObjectField(fields.output_schema);
    return {
        input_schema: jsonSchemaToLlmReadable(inObj, "input"),
        output_schema: jsonSchemaToLlmReadable(outObj, "output"),
    };
}

function jsonSchemaToLlmReadable(schema: Record<string, unknown> | null, role: "input" | "output"): string {
    if (schema === null) return "";
    let body: string;
    try {
        body = JSON.stringify(schema, null, 2);
    } catch {
        return "";
    }
    const header =
        role === "input"
            ? "【Expert 入参 JSON Schema】请据此构造调用本 expert 的 JSON 对象：遵守 type、required、properties 中的 description/default；未列在 required 中的字段若可选可省略。\n\n"
            : "【Expert 出参 JSON Schema】expert 返回的 JSON 应满足下列结构（供你对照或向后续环节传递）。\n\n";
    return `${header}\`\`\`json\n${body}\n\`\`\``;
}

/**
 * 读取多维表格 manifest 列：可能是 JSON 字符串、富文本段、或直接对象。
 * 入/出参 schema 见独立列 inputSchema、outputSchema，不在此解析。
 */
function parseManifestCell(v: unknown): Pick<RegistryRow, "manifest_json" | "manifest" | "manifest_parse_error"> {
    const empty = (): Pick<RegistryRow, "manifest_json" | "manifest" | "manifest_parse_error"> => ({
        manifest_json: "",
        manifest: null,
    });

    if (v === undefined || v === null) return empty();

    let jsonText = "";
    let root: unknown;

    if (Array.isArray(v)) {
        jsonText = bitableCellToString(v);
        if (!jsonText.trim()) return empty();
        try {
            root = JSON.parse(jsonText) as unknown;
        } catch {
            return {
                manifest_json: jsonText,
                manifest: null,
                manifest_parse_error: "JSON 解析失败",
            };
        }
    } else if (typeof v === "string") {
        jsonText = v.trim();
        if (!jsonText) return empty();
        try {
            root = JSON.parse(jsonText) as unknown;
        } catch {
            return {
                manifest_json: jsonText,
                manifest: null,
                manifest_parse_error: "JSON 解析失败",
            };
        }
    } else if (isRecord(v)) {
        if (isProbablyFeishuRichTextSegment(v)) {
            jsonText = String(v.text).trim();
            if (!jsonText) return empty();
            try {
                root = JSON.parse(jsonText) as unknown;
            } catch {
                return {
                    manifest_json: jsonText,
                    manifest: null,
                    manifest_parse_error: "JSON 解析失败",
                };
            }
        } else if (
            "inputSchema" in v ||
            "outputSchema" in v ||
            "input_schema" in v ||
            "output_schema" in v ||
            (typeof v.id === "string" && v.id.length > 0)
        ) {
            root = v;
            try {
                jsonText = JSON.stringify(v);
            } catch {
                jsonText = "";
            }
        } else {
            jsonText = bitableCellToString(v);
            if (jsonText.trim().startsWith("{") || jsonText.trim().startsWith("[")) {
                try {
                    root = JSON.parse(jsonText) as unknown;
                } catch {
                    return {
                        manifest_json: jsonText,
                        manifest: null,
                        manifest_parse_error: "JSON 解析失败",
                    };
                }
            } else {
                try {
                    root = v;
                    jsonText = JSON.stringify(v);
                } catch {
                    return empty();
                }
            }
        }
    } else {
        return empty();
    }

    if (!isRecord(root)) {
        return {
            manifest_json: jsonText,
            manifest: null,
            manifest_parse_error: "manifest 根节点须为 JSON 对象",
        };
    }

    const m = root;
    return {
        manifest_json: jsonText || (() => {
            try {
                return JSON.stringify(m);
            } catch {
                return "";
            }
        })(),
        manifest: m,
    };
}

/** 文本列用 is 筛不到时（列类型/查找引用等），换 contains 再试 */
function buildExpertIdContainsOrFilter(ids: string[]): Record<string, unknown> {
    return {
        conjunction: "or",
        conditions: ids.map((id) => ({
            field_name: EXPERT_ID_FIELD,
            operator: "contains",
            value: [id],
        })),
    };
}

function recordToRow(fields: Record<string, unknown>): RegistryRow | null {
    const expertId = bitableCellToString(fields[EXPERT_ID_FIELD]);
    if (!expertId) return null;
    const manifestParts = parseManifestCell(fields.manifest);
    const schemaParts = standaloneSchemaColumnsToLlmStrings(fields);
    return {
        expert_id: expertId,
        release_id: bitableCellToString(fields[RELEASE_ID_FIELD]) || undefined,
        name: bitableCellToString(fields.name),
        detail: bitableCellToString(fields.detail),
        runtime: bitableCellToString(fields.runtime) || "noop",
        local_repo_path: bitableCellToString(fields.local_repo_path),
        invoke_url: bitableCellToString(fields.invoke_url),
        coze_workflow_id: bitableCellToString(fields.coze_workflow_id),
        ...manifestParts,
        ...schemaParts,
    };
}

function buildPlannerMd(rows: RegistryRow[]): string {
    if (rows.length === 0) return "（无可用专家）";
    return rows
        .map((r) => `- expert_id: \`${r.expert_id}\` | name: ${r.name || "—"} | detail: ${r.detail || "—"}`)
        .join("\n");
}

async function main({ params }: Args): Promise<Output> {
    const appId = "cli_a7d10dcdcf3b900c";
    const appSecret = "1EZalIWqe138v13pMtGCqg35FJ8nSbxY";

    const appToken = "Oup1bQvrJabY24sOyphcQ0C1nic";
    const tableId = "tbl9O8hbznssef7v";

    const expertIds = dedupePreserveOrder(parseExpertIds(params.expert_ids));
    let tenant_token = params.tenant_token;

    if (expertIds.length === 0) {
        return {
            experts_available: [],
            experts_planner_md: "（无可用专家）",
        };
    }

    const releaseId =
        typeof params.release_id === "string" && params.release_id.trim() ? params.release_id.trim() : "";
    if (!releaseId) {
        throw new Error(
            "缺少 params.release_id：须传入当前发布批次 id（与 experts_recaller/nodes/release-id.ts 中 release_id 保持一致）"
        );
    }

    if (!tenant_token) {
        tenant_token = await feishuTenantToken(appId, appSecret);
    }

    const byId = new Map<string, RegistryRow>();

    for (let i = 0; i < expertIds.length; i += EXPERT_ID_FILTER_CHUNK) {
        const chunk = expertIds.slice(i, i + EXPERT_ID_FILTER_CHUNK);
        let rows = await feishuSearchBitableRecordsByFilter(
            tenant_token,
            appToken,
            tableId,
            buildRegistryRecordFilter(buildExpertIdOrFilter(chunk), releaseId),
            releaseId
        );
        if (rows.length === 0) {
            try {
                rows = await feishuSearchBitableRecordsByFilter(
                    tenant_token,
                    appToken,
                    tableId,
                    buildRegistryRecordFilter(buildExpertIdContainsOrFilter(chunk), releaseId),
                    releaseId
                );
            } catch {
                rows = [];
            }
        }
        for (const r of rows) {
            if (!byId.has(r.expert_id)) byId.set(r.expert_id, r);
        }
    }

    // 公式/查找引用等列不支持 filter 时，服务端筛选恒为空；分页拉表后在本地按 expert_id 匹配
    const stillMissing = expertIds.filter((id) => !byId.has(id));
    if (stillMissing.length > 0) {
        const fromScan = await feishuListBitableRecordsScanMatch(
            tenant_token,
            appToken,
            tableId,
            stillMissing,
            releaseId
        );
        for (const r of fromScan) {
            if (!byId.has(r.expert_id)) byId.set(r.expert_id, r);
        }
    }

    const experts_available = expertIds.map((id) => byId.get(id)).filter((x): x is RegistryRow => Boolean(x));
    const experts_planner_md = buildPlannerMd(experts_available);

    return {
        experts_available,
        experts_planner_md,
    };
}

async function feishuTenantToken(appId: string, appSecret: string): Promise<string> {
    const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data.code !== 0) {
        throw new Error(`Feishu token error: ${JSON.stringify(data)}`);
    }
    return String(data.tenant_access_token ?? "");
}

async function feishuSearchBitableRecordsByFilter(
    token: string,
    appToken: string,
    tableId: string,
    filter: Record<string, unknown>,
    releaseId?: string
): Promise<RegistryRow[]> {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
    const out: RegistryRow[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < 20; page++) {
        const body: Record<string, unknown> = {
            page_size: 500,
            filter,
            /* 不传 field_names：避免表里没有某列时接口异常；列名与固定列表不一致时仍能读到 expert_id */
        };
        if (pageToken) body.page_token = pageToken;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (data.code !== 0) {
            throw new Error(`Feishu bitable search error: ${JSON.stringify(data)}`);
        }
        const d = data.data as Record<string, unknown> | undefined;
        const items = (d?.items as unknown[]) ?? [];
        for (const it of items) {
            const rec = it as Record<string, unknown>;
            const fields = (rec.fields as Record<string, unknown>) ?? {};
            if (!isBitableAvailableOn(fields)) continue;
            if (!isBitableReleaseIdMatch(fields, releaseId)) continue;
            const row = recordToRow(fields);
            if (row) out.push(row);
        }
        pageToken = d?.page_token ? String(d.page_token) : undefined;
        if (!pageToken) break;
    }
    return out;
}

/** 不带 filter 分页扫描，直到找齐 wanted 或翻页上限（应对不可筛字段） */
async function feishuListBitableRecordsScanMatch(
    token: string,
    appToken: string,
    tableId: string,
    wanted: string[],
    releaseId?: string
): Promise<RegistryRow[]> {
    const want = new Set(wanted);
    const found: RegistryRow[] = [];
    const got = new Set<string>();
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
    let pageToken: string | undefined;

    for (let page = 0; page < 50; page++) {
        if (want.size === got.size) break;
        const body: Record<string, unknown> = {
            page_size: 500,
        };
        if (pageToken) body.page_token = pageToken;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (data.code !== 0) {
            throw new Error(`Feishu bitable search (scan) error: ${JSON.stringify(data)}`);
        }
        const d = data.data as Record<string, unknown> | undefined;
        const items = (d?.items as unknown[]) ?? [];
        for (const it of items) {
            const rec = it as Record<string, unknown>;
            const fields = (rec.fields as Record<string, unknown>) ?? {};
            if (!isBitableAvailableOn(fields)) continue;
            if (!isBitableReleaseIdMatch(fields, releaseId)) continue;
            const row = recordToRow(fields);
            if (!row || !want.has(row.expert_id) || got.has(row.expert_id)) continue;
            got.add(row.expert_id);
            found.push(row);
        }
        pageToken = d?.page_token ? String(d.page_token) : undefined;
        if (!pageToken) break;
    }
    return found;
}
