/**
 * 节点：WMS 验货细粒度阶段 Gap 标注（当前固定不可用）
 */

const WMS_GAP_NOTE = `WMS 开箱/点数/报告等细粒度验货阶段当前系统不可查。
本专家基于 OMS 入库单状态（PEWC/EWC）与轨迹解读海外验进展，不输出无依据的开箱/点数阶段信息。`;

async function main() {
  return {
    wmsAvailable: false,
    wmsDataAvailable: false,
    gapNote: WMS_GAP_NOTE,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("check-wms-gap")) {
  main().then((r) => process.stdout.write(JSON.stringify(r)));
}
