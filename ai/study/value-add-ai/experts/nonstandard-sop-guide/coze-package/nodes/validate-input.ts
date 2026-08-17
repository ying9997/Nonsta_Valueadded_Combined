/**
 * validate-input — 校验入参合法性，拦截非兜底原子场景。
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

function latestContext(enrichedContext: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = enrichedContext[key];
  if (Array.isArray(value)) return asRecord(value[value.length - 1]);
  return asRecord(value);
}

const CATCHALL_ATOMS = ["库内其他服务需求", "库内其他服务需求（库内异常处理）"];
const CATCHALL_CODES = ["OSF6V1603", "OSF6V1841"];

const NAMED_SERVICE_CODES = ["OSF6V1648", "OSF6V1660", "OSF6V1644", "OSF6V1646", "OSF6V1647"];
const NAMED_SERVICE_NAMES = ["代采购包材物料", "审计盘点", "DG商品销毁", "货权转移（换标模式）", "货权转移（改数模式）"];

function isCatchallAtom(serviceAtom: string, vascCode: string): boolean {
  if (CATCHALL_CODES.includes(vascCode)) return true;
  return CATCHALL_ATOMS.some((name) => serviceAtom.includes(name));
}

function isNamedService(vascCode: string, vascName: string): boolean {
  if (NAMED_SERVICE_CODES.includes(vascCode)) return true;
  return NAMED_SERVICE_NAMES.some((name) => vascName.includes(name));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const inputs = asRecord(params.inputs);
  const enrichedContext = asRecord(params.enrichedContext) || asRecord(inputs.enrichedContext);

  const recContext = latestContext(enrichedContext, "value-add/value-add-product-recommendation-v2")
    || latestContext(enrichedContext, "value-add/value-add-product-recommendation");
  const recStructured = asRecord(recContext.valueAddProductRecommendation);

  const customerIntent = asText(params.customerIntent) || asText(params.query) || asText(inputs.customerIntent);
  const exceptionCode = asText(params.exceptionCode) || asText(inputs.exceptionCode);
  const exceptionName = asText(params.exceptionName) || asText(inputs.exceptionName);

  const recommendedVasc = asRecord(params.recommendedVasc) || asRecord(inputs.recommendedVasc) || asRecord(recStructured.primaryRecommendation);
  const vascCode = asText(recommendedVasc.vascCode);
  const vascName = asText(recommendedVasc.vascName);

  const serviceAtom = asText(params.serviceAtom) || asText(inputs.serviceAtom);
  const providedFields = asRecord(params.providedFields) || asRecord(inputs.providedFields);

  if (isNamedService(vascCode, vascName)) {
    return {
      sopInput: { customerIntent, exceptionCode, exceptionName, recommendedVasc, serviceAtom, providedFields },
      validationResult: {
        ok: false,
        reason: "named_service",
        message: `${vascName || vascCode} 是 A 类命名服务，应由 service-config 处理，不进入 SOP 引导。`,
      },
    };
  }

  if (serviceAtom && !isCatchallAtom(serviceAtom, vascCode)) {
    return {
      sopInput: { customerIntent, exceptionCode, exceptionName, recommendedVasc, serviceAtom, providedFields },
      validationResult: {
        ok: false,
        reason: "not_catchall_atom",
        message: `服务项"${serviceAtom}"不是兜底原子，不需要 SOP 引导。`,
      },
    };
  }

  if (!customerIntent) {
    return {
      sopInput: { customerIntent, exceptionCode, exceptionName, recommendedVasc, serviceAtom, providedFields },
      validationResult: {
        ok: false,
        reason: "missing_intent",
        message: "缺少客户意图描述，无法进行场景匹配。",
      },
    };
  }

  return {
    sopInput: {
      customerIntent,
      exceptionCode,
      exceptionName,
      recommendedVasc,
      serviceAtom,
      providedFields,
      enrichedContext,
    },
    validationResult: { ok: true },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "validate-input failed");
      process.exit(1);
    });
}
