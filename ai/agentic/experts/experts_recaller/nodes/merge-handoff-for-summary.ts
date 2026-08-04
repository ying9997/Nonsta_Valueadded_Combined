/**
 * 汇聚 finalize-queue-handoff（正常路径）和 finalize-planner-skip（bypass 路径）
 * 的 handoff_log_markdown，取非空值传给 queue-user-facing-summary。
 * 两条路径在运行时只有一条执行，另一条输出为 null/空。
 *
 * Coze：整文件粘贴；常量前缀 MERGE_ 避免与其它节点合并冲突。
 */

async function main({
    params,
}: {
    params: {
        /** finalize-queue-handoff 的输出（正常路径有值，bypass 路径为空） */
        from_queue?: unknown;
        /** finalize-planner-skip 的输出（bypass 路径有值，正常路径为空） */
        from_bypass?: unknown;
    };
}): Promise<{
    handoff_log_markdown: string;
}> {
    const fromQueue =
        params.from_queue !== null && params.from_queue !== undefined
            ? String(params.from_queue).trim()
            : "";
    const fromBypass =
        params.from_bypass !== null && params.from_bypass !== undefined
            ? String(params.from_bypass).trim()
            : "";
    const handoff_log_markdown = fromQueue || fromBypass;
    return { handoff_log_markdown };
}
