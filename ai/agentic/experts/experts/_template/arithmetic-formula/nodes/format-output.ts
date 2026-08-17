/**
 * 合并代码求值结果与 LLM 点评，产出专家最终 result / outputContext。
 * 与 `workflow.json` 中本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`main({ params })` → `params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured?: Record<string, unknown>; analysis?: string } | 前置节点 `evaluate-expression` 的产出 |
 * | analysisResult | { structured?: Record<string, unknown>; analysis?: string } | 前置 LLM 节点 `llm-comment` 的产出（即 `runLlmNode` 返回的 analysisResult） |
 * | inputContext | object（可选） | `sourceExpertId?: string; previousOutput?: string \| object; chainId?: string` |
 *
 * 【输出】`return` 根级四字段（与 call-expert.ts / design-spec §7 一致）：
 * | structured | object | 业务结构化结果 |
 * | analysis | string | 对客长文 |
 * | outputContext | object | expertId、resultSummary、chainId |
 * | enrichedContext | object | 编排手交事实；无则 `{}` |
 */

const EXPERT_ID = "arithmetic-formula";

interface ComputationResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const computation = (params.result ?? {}) as ComputationResult;
  const llm = (params.analysisResult ?? {}) as AnalysisResult;
  const inputContext = params.inputContext as InputContext | undefined;

  const mergedStructured = {
    computation: computation.structured ?? {},
    review: llm.structured ?? {},
  };

  const compLine = computation.analysis?.trim() ?? "";
  const reviewLine = llm.analysis?.trim() ?? "";
  let analysis: string;
  if (reviewLine && compLine) {
    analysis = `【计算结论】\n${compLine}\n\n【模型点评】\n${reviewLine}`;
  } else if (reviewLine) {
    analysis = reviewLine;
  } else {
    analysis = compLine || "（无点评与计算说明）";
  }

  const resultSummary = (reviewLine || compLine).slice(0, 200) || "四则运算与点评完成";

  return {
    structured: mergedStructured,
    analysis,
    outputContext: {
      expertId: EXPERT_ID,
      resultSummary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
