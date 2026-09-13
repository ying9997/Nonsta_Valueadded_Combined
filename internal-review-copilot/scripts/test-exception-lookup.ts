/**
 * Smoke: exception-lookup cache / inline / known-table fallback (no live OMS).
 *
 *   npx tsx internal-review-copilot/scripts/test-exception-lookup.ts
 */
import {
  clearExceptionCache,
  formatExceptionDetails,
  getKnownExceptionTable,
  lookupExceptions,
} from "../lib/exception-lookup.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  clearExceptionCache();
  const known = getKnownExceptionTable();
  assert(known.EB0126070130941754?.name.includes("商品条码异常"), "known table kept");

  const inline = await lookupExceptions(["EB999"], [{ ebNo: "EB999", eventName: "商品条码异常(需客户处理)", eventObj: "商品" }]);
  assert(inline[0].source === "inline", "inline first");
  assert(inline[0].exceptionName.includes("商品条码异常"), "inline name");

  const fallback = await lookupExceptions(["EB0126070130941754"], undefined, {
    queryDetail: async () => {
      throw new Error("oms down");
    },
  });
  assert(fallback[0].source === "known_table", "OMS fail → known_table");
  assert(fallback[0].exceptionName.includes("商品条码异常"), "known name");

  const missing = await lookupExceptions(["EB0000000000000000"], undefined, {
    queryDetail: async () => {
      throw new Error("oms down");
    },
  });
  assert(missing[0].source === "not_found", "unknown EB → not_found");

  const oms = await lookupExceptions(["EB0126090932893980"], undefined, {
    queryDetail: async () => ({ exceptionName: "商品条码异常(需客户处理)", exceptionObject: "商品" }),
    getClient: async () => ({}) as never,
  });
  assert(oms[0].source === "oms_api", "oms_api source");
  const cached = await lookupExceptions(["EB0126090932893980"], undefined, {
    queryDetail: async () => {
      throw new Error("should not hit oms");
    },
  });
  assert(cached[0].source === "cache", "second lookup uses cache");
  assert(cached[0].exceptionName.includes("商品条码异常"), "cache keeps name");

  const formatted = formatExceptionDetails(oms);
  assert(formatted.includes("商品条码异常"), "format includes name");
  assert(!formatted.includes("可能构成批量异常"), "no batch rewrite hint");
  assert(formatted.includes("必须按换商品标签"), "format warns against T1 rewrite");

  const { applyExceptionNameOverride } = await import("../lib/llm-scene-classifier.ts");
  const infos = [
    { ebNo: "EB1", exceptionName: "商品条码异常(需客户处理)", exceptionObject: "商品", source: "oms_api" as const },
    { ebNo: "EB2", exceptionName: "商品条码异常(需客户处理)", exceptionObject: "商品", source: "oms_api" as const },
  ];
  const a = applyExceptionNameOverride(
    "inbound_package_barcode_batch_relabel",
    infos,
    "扫描彩盒上的单品标签补贴包裹标签上架到新单",
  );
  assert(a.overridden && a.scene === "inbound_package_exception_relabel_shelving", "360750-style override to scene 5");
  const b = applyExceptionNameOverride(
    "inbound_package_barcode_batch_relabel",
    infos,
    "不换商品标签，只换箱唛上架到新单",
  );
  assert(!b.overridden && b.scene === "inbound_package_barcode_batch_relabel", "311652 explicit package-only stays scene 1");

  console.log("test-exception-lookup ok");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
