import { applyFieldMap } from "./field-map";
import { buildIoSummary } from "./schema-io-summary";
import type { ExpertScanEntry } from "./scan-experts";

export function buildLogicalFields(entry: ExpertScanEntry, verResolved: string, releaseId?: string): Record<string, unknown> {
  const { manifest, localRepoPath } = entry;

  const logical: Record<string, unknown> = {
    expert_id: manifest.id,
    ver: verResolved,
    name: manifest.name ?? "",
    detail: manifest.description ?? "",
    runtime: "local_repo",
    local_repo_path: localRepoPath,
    invoke_url: "",
    manifest: JSON.stringify(manifest, null, 2),
    inputSchema: JSON.stringify(manifest.inputSchema ?? {}, null, 2),
    outputSchema: JSON.stringify(manifest.outputSchema ?? {}, null, 2),
    io: buildIoSummary(manifest.inputSchema, manifest.outputSchema),
  };
  const rid = releaseId?.trim();
  if (rid) logical.release_id = rid;
  return logical;
}

export function buildBitableFields(entry: ExpertScanEntry, verResolved: string, releaseId?: string): Record<string, unknown> {
  return applyFieldMap(buildLogicalFields(entry, verResolved, releaseId));
}
