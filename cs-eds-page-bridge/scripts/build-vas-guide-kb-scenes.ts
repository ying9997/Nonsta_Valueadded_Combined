/**
 * 从 internal-review-copilot 场景卡生成 VAS 指引场景知识库。
 *   npx tsx scripts/build-vas-guide-kb-scenes.ts
 * 只读场景卡，不改 copilot 仓库。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cardsDir = path.resolve(root, "..", "internal-review-copilot", "knowledge", "scenario-cards");
const outFile = path.join(root, "prompts", "vas-guide-kb-scenes.md");

const PRIORITY_KEYS = [
  "inbound_label_identify",
  "inbound_package_exception_relabel_shelving",
  "inbound_photo_hold",
  "inbound_package_barcode_batch_relabel",
  "inbound_third_party_merchandise_barcode",
  "instock_relabel_change_sku",
  "instock_photo_video",
  "instock_ownership_transfer",
  "instock_inventory_freeze",
  "instock_good_to_defective",
];

const CATEGORY_LABEL: Record<string, string> = {
  inbound: "入库",
  instock: "库内",
  outbound: "出库",
};

type InfoField = {
  field?: string;
  description?: string;
  examples?: string[];
  required?: boolean;
};

type Card = {
  sceneKey?: string;
  sceneName?: string;
  status?: string;
  category?: string;
  positiveSignals?: { strong?: string[]; weak?: string[] };
  negativeSignals?: { hard?: string[]; soft?: string[] };
  requiredInfoFields?: InfoField[];
  optionalInfoFields?: InfoField[];
};

function asList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}

function formatFields(fields: InfoField[] | undefined): string {
  if (!fields || fields.length === 0) return "  （无）";
  return fields
    .map((f, i) => {
      const name = f.field || `字段${i + 1}`;
      const desc = f.description || "";
      const ex = (f.examples || []).slice(0, 3).join(" / ");
      const extra = ex ? `（例: ${ex}）` : "";
      return `  ${i + 1}. ${name}: ${desc}${extra}`;
    })
    .join("\n");
}

function loadCards(): Card[] {
  if (!fs.existsSync(cardsDir)) throw new Error("找不到场景卡目录: " + cardsDir);
  const files = fs.readdirSync(cardsDir).filter((n) => n.endsWith(".json"));
  const cards: Card[] = [];
  for (const name of files) {
    const raw = fs.readFileSync(path.join(cardsDir, name), "utf8");
    let parsed: Card;
    try {
      parsed = JSON.parse(raw) as Card;
    } catch {
      continue;
    }
    if (parsed.status === "retired_dedicated_atom") continue;
    if (!Array.isArray(parsed.requiredInfoFields) || parsed.requiredInfoFields.length === 0) continue;
    if (!parsed.sceneKey) continue;
    cards.push(parsed);
  }
  cards.sort((a, b) => {
    const ai = PRIORITY_KEYS.indexOf(a.sceneKey || "");
    const bi = PRIORITY_KEYS.indexOf(b.sceneKey || "");
    const ap = ai < 0 ? 100 : ai;
    const bp = bi < 0 ? 100 : bi;
    if (ap !== bp) return ap - bp;
    return (a.sceneKey || "").localeCompare(b.sceneKey || "");
  });
  return cards;
}

function renderCard(card: Card): string {
  const key = card.sceneKey || "";
  const name = (card.sceneName || key).replace(/^【[^】]+】/, "");
  const cat = CATEGORY_LABEL[card.category || ""] || card.category || "未分类";
  const strong = asList(card.positiveSignals?.strong);
  const weak = asList(card.positiveSignals?.weak);
  const hard = asList(card.negativeSignals?.hard);
  const soft = asList(card.negativeSignals?.soft);
  const exclude = [...hard, ...soft];
  return [
    `### 场景: ${name} (key: ${key})`,
    `类别: ${cat}`,
    "识别信号:",
    `  强信号: ${strong.join("、") || "（无）"}`,
    `  弱信号: ${weak.join("、") || "（无）"}`,
    `排除信号: ${exclude.join("、") || "（无）"}`,
    "必填信息:",
    formatFields(card.requiredInfoFields),
    "可选信息:",
    formatFields(card.optionalInfoFields),
    "",
  ].join("\n");
}

function main(): void {
  const cards = loadCards();
  const lines = [
    "# VAS 指引 · 场景知识库（精编）",
    "",
    "由 `scripts/build-vas-guide-kb-scenes.ts` 从 `internal-review-copilot/knowledge/scenario-cards` 生成。",
    "筛选：`status !== retired_dedicated_atom` 且有 `requiredInfoFields`。不要手改本文件，改场景卡后重跑脚本。",
    "",
    `共 ${cards.length} 张。贴进 Coze Text 节点，变量名 \`scene_kb\`。`,
    "",
    "匹配时看客户描述中的关键动作词 + 处理对象。优先强信号；命中排除信号则不要选该场景。",
    "",
  ];
  for (const card of cards) lines.push(renderCard(card));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, lines.join("\n").trimEnd() + "\n", "utf8");
  console.log(`wrote ${cards.length} scenes -> ${outFile}`);
}

main();
