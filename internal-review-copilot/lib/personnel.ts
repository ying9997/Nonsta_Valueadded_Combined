import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { copilotDir } from "./env.ts";
import { asRecord, asText, isAllowedServiceAtom } from "./oms-adapter.ts";
import type { JsonRecord } from "./types.ts";
import { resolveOrderCategory } from "./order-category.ts";
import type { DemoPersonnel } from "./feishu-card.ts";

export interface PersonRef {
  name: string;
  openId: string | null;
}

export interface PersonnelFile {
  入库: { 审核员: PersonRef };
  库内: { 审核员: PersonRef };
  cc: { 负责人: PersonRef };
  default: { 销售: PersonRef; 客服?: PersonRef };
}

function personOf(raw: unknown, fallbackName: string): PersonRef {
  const rec = asRecord(raw);
  return {
    name: asText(rec.name) || fallbackName,
    openId: asText(rec.openId) || null,
  };
}

let personnelPathOverride = "";

export function setPersonnelPath(path: string): void {
  if (path) personnelPathOverride = path;
}

export function defaultPersonnelPath(): string {
  return resolve(copilotDir(), "config/personnel.json");
}

export function serviceCodeOf(detail: JsonRecord): string {
  const atoms = Array.isArray(detail.atoms) ? detail.atoms : [];
  const atomRecords = atoms.map((item) => asRecord(item));
  const allowed = atomRecords.find((atom) => isAllowedServiceAtom(atom));
  if (allowed) return asText(allowed.serviceCode);
  const first = atomRecords[0] || asRecord(detail.atom);
  return asText(detail.serviceCode) || asText(first.serviceCode) || asText(asRecord(detail.atom).serviceCode);
}

export function loadPersonnelConfig(path?: string): PersonnelFile {
  const file = path || personnelPathOverride || defaultPersonnelPath();
  const fallback: PersonnelFile = {
    入库: { 审核员: { name: "耿文文", openId: "ou_fb036b896ab183f3eea939470e47bf66" } },
    库内: { 审核员: { name: "何静", openId: "ou_38892cd1daae40290c0a4994e614900a" } },
    cc: { 负责人: { name: "李颖", openId: "ou_c62fe459a4407900cdef6d340dbeb24c" } },
    default: { 销售: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" } },
  };
  if (!file || !existsSync(file)) return fallback;
  const raw = asRecord(JSON.parse(readFileSync(file, "utf8")));
  if (raw["审核员"] || raw["销售"]) {
    const reviewer = personOf(raw["审核员"], fallback.入库.审核员.name);
    const sales = personOf(raw["销售"], fallback.default.销售.name);
    return {
      入库: { 审核员: reviewer },
      库内: { 审核员: reviewer },
      cc: { 负责人: personOf(raw["负责人"], fallback.cc.负责人.name) },
      default: { 销售: sales, 客服: personOf(raw["客服"], "客服") },
    };
  }
  return {
    入库: { 审核员: personOf(asRecord(raw["入库"])["审核员"], fallback.入库.审核员.name) },
    库内: { 审核员: personOf(asRecord(raw["库内"])["审核员"], fallback.库内.审核员.name) },
    cc: { 负责人: personOf(asRecord(raw.cc)["负责人"], fallback.cc.负责人.name) },
    default: {
      销售: personOf(asRecord(raw.default)["销售"], fallback.default.销售.name),
      客服: personOf(asRecord(raw.default)["客服"], "客服"),
    },
  };
}

export function resolvePersonnel(input?: {
  businessTypeDesc?: string;
  businessType?: string;
  vaSource?: string;
}): DemoPersonnel {
  const config = loadPersonnelConfig();
  const category = resolveOrderCategory(input || {});
  const reviewer =
    (category === "instock" ? config.库内?.审核员 : config.入库?.审核员) || config.入库.审核员;
  return {
    审核员: reviewer,
    销售: config.default.销售,
    负责人: config.cc.负责人,
    客服: config.default.客服 || { name: "客服", openId: null },
  };
}

export function resolvePersonnelFromDetail(detail?: JsonRecord, facts?: {
  businessTypeDesc?: string;
  businessType?: string;
  vaSource?: string;
}): DemoPersonnel {
  const header = asRecord(detail?.listHeader);
  return resolvePersonnel({
    businessTypeDesc: asText(facts?.businessTypeDesc) || asText(header.businessTypeDesc),
    businessType: asText(facts?.businessType) || asText(header.businessType),
    vaSource: asText(facts?.vaSource) || asText(header.vaSource),
  });
}

export function personnelDirectory(): DemoPersonnel {
  const config = loadPersonnelConfig();
  return {
    审核员: config.入库.审核员,
    入库审核员: config.入库.审核员,
    库内审核员: config.库内.审核员,
    销售: config.default.销售,
    负责人: config.cc.负责人,
    客服: config.default.客服 || { name: "客服", openId: null },
  };
}

export function reviewerOpenIds(): string[] {
  const config = loadPersonnelConfig();
  return [config.入库.审核员.openId, config.库内.审核员.openId, config.cc.负责人.openId].filter(
    (id): id is string => Boolean(id),
  );
}

export function namesForOpenIds(ids: string[]): string[] {
  const config = loadPersonnelConfig();
  const people = [config.入库.审核员, config.库内.审核员, config.cc.负责人, config.default.销售];
  return ids.map((id) => people.find((person) => person.openId === id)?.name || id);
}
