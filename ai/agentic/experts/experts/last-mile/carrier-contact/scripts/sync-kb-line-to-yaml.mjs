import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tsPath = path.join(root, "nodes", "load-carrier-knowledge.ts");
const yamlPath = path.join(root, "workflow", "workflow", "carrier_contact-draft.yaml");

const ts = fs.readFileSync(tsPath, "utf8");
const prefix = "const CARRIER_KB_MARKDOWN: string = ";
const i = ts.indexOf(prefix);
if (i < 0) throw new Error("CARRIER_KB_MARKDOWN not found in ts");
let rest = ts.slice(i + prefix.length).trimStart();
if (rest[0] !== '"') throw new Error("expected opening quote");
let j = 1;
let sb = "";
while (j < rest.length) {
  const c = rest[j++];
  if (c === "\\") {
    sb += c + rest[j++];
    continue;
  }
  if (c === '"') break;
  sb += c;
}
const yamlIndent = "              ";
const fullLine = yamlIndent + prefix + JSON.stringify(sb) + ";";

let y = fs.readFileSync(yamlPath, "utf8");
const re = /^              const CARRIER_KB_MARKDOWN: string = .*$/m;
if (!re.test(y)) throw new Error("yaml pattern not found");
y = y.replace(re, fullLine);
fs.writeFileSync(yamlPath, y);
console.log("Wrote", yamlPath, "line len", fullLine.length);
