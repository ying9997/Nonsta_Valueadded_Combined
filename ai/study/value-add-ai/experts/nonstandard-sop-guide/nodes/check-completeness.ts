/**
 * check-completeness — 对照 B 类模板的必填字段检查已提供信息。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

interface FieldSpec {
  field: string;
  required: boolean;
  clarificationPrompt: string;
}

const SCENARIO_FIELDS: Record<number, FieldSpec[]> = {
  1: [
    { field: "检测SKU", required: true, clarificationPrompt: "请提供需要检测的 SKU 编码" },
    { field: "检测要求", required: true, clarificationPrompt: "请描述具体的检测要求（如外观检查、功能测试等）" },
    { field: "判定标准", required: true, clarificationPrompt: "良品和不良品的判定标准是什么？" },
    { field: "良品处理", required: true, clarificationPrompt: "检测为良品后如何处理？（如重新上架、新入库单上架等）" },
    { field: "不良品处理", required: true, clarificationPrompt: "检测为不良品后如何处理？（如不良品库位上架、销毁等）" },
  ],
  2: [
    { field: "原SKU", required: true, clarificationPrompt: "请提供需要拆分的原 SKU 编码" },
    { field: "拆分后SKU", required: true, clarificationPrompt: "拆分后的 SKU 编码是什么？" },
    { field: "数量", required: true, clarificationPrompt: "需要拆分的数量是多少？" },
    { field: "新入库单", required: true, clarificationPrompt: "是否已创建新入库单？请提供入库单号" },
    { field: "标签文件", required: false, clarificationPrompt: "是否需要提供新标签文件？" },
  ],
  3: [
    { field: "主产品", required: true, clarificationPrompt: "请提供主产品 SKU" },
    { field: "配件", required: true, clarificationPrompt: "需要组合的配件 SKU 是什么？" },
    { field: "组合方式", required: true, clarificationPrompt: "组合方式是什么？（如捆绑、装袋、装盒等）" },
    { field: "新入库单", required: true, clarificationPrompt: "组合后是否需要新入库单？请提供入库单号" },
  ],
  4: [
    { field: "拍照范围", required: true, clarificationPrompt: "需要拍照的商品范围是？（如指定 SKU、指定库位、全部）" },
    { field: "照片用途", required: true, clarificationPrompt: "照片/视频的用途是什么？" },
    { field: "拍摄位置/角度", required: true, clarificationPrompt: "需要从什么位置/角度拍摄？" },
    { field: "数量要求", required: true, clarificationPrompt: "每件商品需要拍几张？" },
    { field: "命名规范", required: false, clarificationPrompt: "照片的命名规则是什么？" },
  ],
  5: [
    { field: "退货单/SKU", required: true, clarificationPrompt: "请提供退货单号或对应 SKU" },
    { field: "测量要求", required: true, clarificationPrompt: "需要测量哪些维度？（长宽高/重量/全部）" },
  ],
  6: [
    { field: "指定商品", required: true, clarificationPrompt: "请提供需要换标的商品编码或库位" },
    { field: "新SKU", required: true, clarificationPrompt: "更换后的新 SKU 编码是什么？" },
    { field: "入库单", required: true, clarificationPrompt: "请提供新入库单号" },
  ],
  7: [
    { field: "SKU", required: true, clarificationPrompt: "请提供需要冻结/解冻的 SKU" },
    { field: "数量", required: true, clarificationPrompt: "需要冻结/解冻的数量是多少？" },
    { field: "冻结或解冻", required: true, clarificationPrompt: "是需要冻结还是解冻？" },
    { field: "原因", required: true, clarificationPrompt: "冻结/解冻的原因是什么？" },
  ],
  8: [
    { field: "出库单", required: true, clarificationPrompt: "请提供需要取消的自提出库单号" },
    { field: "新入库单", required: true, clarificationPrompt: "取消后商品如何处理？请提供新入库单号" },
    { field: "检查项", required: false, clarificationPrompt: "是否有特殊检查要求？" },
  ],
  9: [
    { field: "异常编号", required: true, clarificationPrompt: "请提供异常单编号" },
    { field: "重新拍照要求", required: true, clarificationPrompt: "重新拍照的具体要求是什么？（角度/数量/背景等）" },
    { field: "命名规则", required: false, clarificationPrompt: "照片的命名规则是什么？" },
  ],
  10: [
    { field: "检测SKU", required: true, clarificationPrompt: "请提供异常商品的 SKU" },
    { field: "判定结果", required: true, clarificationPrompt: "判定为不良品的原因是什么？" },
    { field: "数量", required: true, clarificationPrompt: "需要转不良品上架的数量是多少？" },
  ],
  11: [
    { field: "商品编码", required: true, clarificationPrompt: "请提供需要辨识的商品编码" },
    { field: "是否开箱", required: true, clarificationPrompt: "是否需要开箱辨识？" },
    { field: "辨识方法", required: true, clarificationPrompt: "辨识方法是什么？（如外观、条码、标签等）" },
  ],
  12: [
    { field: "包材", required: true, clarificationPrompt: "需要更换成什么客制包材？（请描述包材规格）" },
    { field: "新入库单", required: true, clarificationPrompt: "是否需要新入库单？请提供入库单号" },
  ],
  13: [
    { field: "SKU", required: true, clarificationPrompt: "请提供需要更换日期标签的 SKU" },
    { field: "数量", required: true, clarificationPrompt: "需要更换的数量是多少？" },
  ],
  14: [
    { field: "SKU", required: true, clarificationPrompt: "请提供需要从不良品转为良品的 SKU" },
    { field: "数量", required: true, clarificationPrompt: "转良品的数量是多少？" },
    { field: "原不良品原因", required: true, clarificationPrompt: "原来判定为不良品的原因是什么？" },
  ],
  15: [
    { field: "原SKU", required: true, clarificationPrompt: "请提供原 SKU 编码" },
    { field: "新SKU", required: true, clarificationPrompt: "更换后的新 SKU 编码是什么？" },
    { field: "数量", required: true, clarificationPrompt: "需要更换的数量是多少？" },
  ],
  16: [
    { field: "A+包裹条码", required: true, clarificationPrompt: "请提供 A+ 包裹条码" },
    { field: "新入库单", required: true, clarificationPrompt: "请提供新入库单号" },
  ],
  17: [
    { field: "SKU", required: true, clarificationPrompt: "请提供需要贴标的 SKU" },
    { field: "标签类型", required: true, clarificationPrompt: "需要贴什么类型的标签？" },
    { field: "贴标要求", required: true, clarificationPrompt: "贴标的具体位置和要求是什么？" },
  ],
  18: [
    { field: "出库单", required: true, clarificationPrompt: "请提供关联的出库单号" },
    { field: "WINIT包材型号", required: true, clarificationPrompt: "需要更换成哪种 WINIT 包材型号？" },
    { field: "新入库单", required: true, clarificationPrompt: "请提供新入库单号" },
    { field: "标签文件", required: false, clarificationPrompt: "是否需要提供新标签文件？" },
  ],
  19: [
    { field: "案例背景", required: true, clarificationPrompt: "请描述需要 SN 采集的案例背景" },
    { field: "适用条件", required: true, clarificationPrompt: "适用条件是什么？" },
    { field: "前置条件", required: true, clarificationPrompt: "有哪些前置条件需要满足？" },
  ],
  20: [
    { field: "调拨需求", required: true, clarificationPrompt: "请描述调拨需求（从哪个仓到哪个仓、商品、数量）" },
  ],
  21: [
    { field: "背景", required: true, clarificationPrompt: "请描述为什么需要将良品转为不良品" },
    { field: "增值单需求描述", required: true, clarificationPrompt: "请提供增值单的需求描述" },
  ],
  22: [
    { field: "审核要点", required: true, clarificationPrompt: "请描述异常单审核要点" },
    { field: "短期方案", required: true, clarificationPrompt: "短期处理方案是什么？" },
  ],
  23: [
    { field: "包材类型", required: true, clarificationPrompt: "需要哪种 WINIT 标准包材？" },
    { field: "规格", required: true, clarificationPrompt: "包材规格是什么？" },
    { field: "数量", required: true, clarificationPrompt: "需要多少数量？" },
    { field: "用途", required: true, clarificationPrompt: "包材用途是什么？" },
  ],
};

function checkFields(scenarioId: number, providedFields: Record<string, unknown>): {
  complete: boolean;
  missingFields: { field: string; required: boolean; clarificationPrompt: string }[];
  providedCount: number;
  totalRequired: number;
} {
  const specs = SCENARIO_FIELDS[scenarioId];
  if (!specs) {
    return { complete: false, missingFields: [], providedCount: 0, totalRequired: 0 };
  }

  const provided = Object.keys(providedFields).filter((k) => {
    const v = providedFields[k];
    return v !== null && v !== undefined && asText(v) !== "";
  });

  const missing: { field: string; required: boolean; clarificationPrompt: string }[] = [];
  const requiredSpecs = specs.filter((s) => s.required);

  for (const spec of requiredSpecs) {
    const found = provided.some(
      (p) => p === spec.field || p.includes(spec.field) || spec.field.includes(p)
    );
    if (!found) {
      missing.push(spec);
    }
  }

  return {
    complete: missing.length === 0,
    missingFields: missing,
    providedCount: provided.length,
    totalRequired: requiredSpecs.length,
  };
}

export async function main({ params }: { params: Record<string, unknown> }) {
  const sopInput = asRecord(params.sopInput);
  const matchResult = asRecord(params.matchResult);

  if (!matchResult.matched || matchResult.category === "C") {
    return {
      completenessResult: {
        applicable: false,
        reason: matchResult.category === "C" ? "c_category_no_template" : "no_match",
      },
      sopInput,
      matchResult,
    };
  }

  const scenarioId = matchResult.scenarioId as number;
  const providedFields = asRecord(sopInput.providedFields);
  const result = checkFields(scenarioId, providedFields);

  return {
    completenessResult: {
      applicable: true,
      complete: result.complete,
      missingFields: result.missingFields,
      providedCount: result.providedCount,
      totalRequired: result.totalRequired,
      scenarioId,
      scenarioName: asText(matchResult.scenarioName as unknown),
    },
    sopInput,
    matchResult,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("check-completeness")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "check-completeness failed");
      process.exit(1);
    });
}
