/**
 * 节点：按内嵌最小货型阈值补算 itemType（不依赖 gitignore _kb）
 *
 * 启发式（实现期可替换为正式货型标准 textNode）：
 * - small: 最长边 ≤ 45cm 且重量 ≤ 2kg
 * - medium: 最长边 ≤ 60cm 且重量 ≤ 15kg
 * - large: 最长边 ≤ 120cm 且重量 ≤ 30kg
 * - oversized: 其余或无法判断但有尺重时按 oversized；无尺重则保持 null
 */

import type { ProfileDimensions, ProfileRow } from "../../../../shared/sku-item-page-list";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcItemType(dims: ProfileDimensions | null): string | null {
  if (!dims) return null;
  const length = num(dims.length);
  const width = num(dims.width);
  const height = num(dims.height);
  const weight = num(dims.weight);
  if (
    length == null ||
    width == null ||
    height == null ||
    weight == null ||
    length <= 0 ||
    width <= 0 ||
    height <= 0 ||
    weight <= 0
  ) {
    return null;
  }
  const longest = Math.max(length, width, height);
  if (longest <= 45 && weight <= 2) return "small";
  if (longest <= 60 && weight <= 15) return "medium";
  if (longest <= 120 && weight <= 30) return "large";
  return "oversized";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const merged = (Array.isArray(params.mergedProfiles) ? params.mergedProfiles : []) as ProfileRow[];
  const missingFacts = (Array.isArray(params.missingFacts) ? params.missingFacts : []).map(String);
  const skus: ProfileRow[] = [];

  for (const profile of merged) {
    const next = { ...profile };
    const existing = typeof next.itemType === "string" && next.itemType ? next.itemType : null;
    if (!existing) {
      const dims = asRecord(next.registeredDimensions) as ProfileDimensions;
      const dimsOrNull = Object.keys(dims).length ? dims : null;
      const computed = calcItemType(dimsOrNull);
      if (computed) {
        next.itemType = computed;
        if (next.dataSource === "api") {
          // itemType 为 KB 计算，保留 api 事实源，但 confidence 不因件型单独下调
        } else if (next.dataSource === "derived") {
          next.dataSource = "derived";
        } else {
          next.dataSource = next.dataSource || "kb";
        }
      } else {
        missingFacts.push(`itemType_unknown:${String(next.skuCode ?? "")}`);
      }
    }
    skus.push(next);
  }

  return { skus, missingFacts: [...new Set(missingFacts)] };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("calc-item-type-from-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
