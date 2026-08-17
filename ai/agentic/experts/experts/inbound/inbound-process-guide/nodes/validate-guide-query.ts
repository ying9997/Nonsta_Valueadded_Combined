/**
 * 节点：validate-guide-query — 规范化 topic，识别 intentType
 * FaaS 单文件闭环，无外部 import。
 */

type IntentType = "process" | "rule" | "fee" | "prohibition" | "psc_select" | "general";

const INTENT_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  {
    type: "process",
    patterns: [
      /流程|步骤|怎么操作|如何入库|怎么走|SOP|下单|新建|下入库单/i,
      /头程|直发|自验|海外验|状态机|状态码|DR|OD|RE|TS|PEWC|SHD/i,
      /上架时效|SLA|混装|转运|双轨|送仓方式|预约/i,
    ],
  },
  {
    type: "fee",
    patterns: [/费用|收费|冻结|扣费|运费|入库费|关税|增值税|账单/i],
  },
  {
    type: "prohibition",
    patterns: [/禁运|限运|危险品|带电|液体|易碎|不能入/i],
  },
  {
    type: "psc_select",
    patterns: [/PSC|产品选型|选型|区别|对比|OW01|标准头程|三种链路/i],
  },
  {
    type: "rule",
    patterns: [/规则|限制|CBM|件型|包裹类型|逾期|箱号|SKU|权限|入口|报错|申报/i],
  },
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function detectIntentType(topic: string, subTopic: string): IntentType {
  const combined = `${topic} ${subTopic}`;
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(combined))) return type;
  }
  return "general";
}

function extractEnabledProducts(inputContext: unknown): string[] {
  if (!inputContext || typeof inputContext !== "object" || Array.isArray(inputContext)) return [];
  const ctx = inputContext as Record<string, unknown>;
  const prev = ctx.previousOutput;
  if (!prev || typeof prev !== "object" || Array.isArray(prev)) return [];
  const structured = (prev as Record<string, unknown>).structured;
  if (!structured || typeof structured !== "object" || Array.isArray(structured)) return [];
  const products = (structured as Record<string, unknown>).enabledProducts;
  return Array.isArray(products) ? products.map((p) => String(p)) : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const topic = str(params.topic);
  const subTopic = str(params.subTopic);
  const country = str(params.country).toUpperCase();
  const productLine = str(params.productLine) || str(params.pscCode);
  const customerIntent = str(params.customerIntent);
  const inputContext = params.inputContext ?? {};
  const enabledProducts = extractEnabledProducts(inputContext);

  const validationOk = topic.length > 0;
  const normalizedTopic = subTopic ? `${topic} — ${subTopic}` : topic;
  const intentType = detectIntentType(topic, subTopic);

  return validationOk
    ? {
        validationOk: true,
        intentType,
        normalizedTopic,
        country,
        productLine,
        subTopic,
        customerIntent,
        inputContext,
        enabledProducts,
      }
    : {
        validationOk: false,
        error: "topic 为必填项",
        intentType,
        normalizedTopic,
        country,
        productLine,
        subTopic,
        customerIntent,
        inputContext,
        enabledProducts,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-guide-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
