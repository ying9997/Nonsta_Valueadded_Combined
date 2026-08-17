import { execFileSync } from "child_process";
import * as path from "path";

const root = path.resolve(__dirname, "../../..");
const tsNode = require.resolve("ts-node/dist/bin.js");
const tsconfig = path.join(root, "scripts", "tsconfig.json");

function runFacts(applicationTime: number | string, analysisUtcIso: string): Record<string, unknown> {
  const pluginData = JSON.stringify({
    content: [
      {
        serialNumber: "TA260721045",
        checkingStatus: "SSC",
        applicationTime,
      },
    ],
  });
  const stdout = execFileSync(
    process.execPath,
    [
      tsNode,
      "-P",
      tsconfig,
      path.join(__dirname, "nodes/fetch-tail-trace-list.ts"),
      JSON.stringify({
        branch: "query",
        inquiryIds: ["TA260721045"],
        winitRequestData: "{}",
        winitOpenapiData: pluginData,
        analysisClock: { utcIso: analysisUtcIso },
      }),
    ],
    { encoding: "utf8" }
  );
  const result = JSON.parse(stdout) as { tailTraceFacts?: Record<string, unknown> };
  return result.tailTraceFacts ?? {};
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const reportedCase = runFacts("2026-07-21 09:31:27", "2026-07-29T06:32:02.000Z");
assertEqual(reportedCase.elapsedBizDays, 6, "reported case elapsedBizDays");
assertEqual(reportedCase.slaBand, "within_10_days", "reported case slaBand");
assertEqual(reportedCase.canEscalateUrgent, true, "reported case canEscalateUrgent");
assertEqual(reportedCase.applicationTimeLocal, "2026-07-21 09:31:27", "reported case applicationTimeLocal");
assertEqual(reportedCase.analysisTimeLocal, "2026-07-29 14:32:02", "reported case analysisTimeLocal");

const weekendCase = runFacts("2026-07-24 18:00:00", "2026-07-27T02:00:00.000Z");
assertEqual(weekendCase.elapsedBizDays, 1, "Friday to Monday elapsedBizDays");
assertEqual(weekendCase.slaBand, "within_1_day", "Friday to Monday slaBand");
assertEqual(weekendCase.canEscalateUrgent, false, "Friday to Monday canEscalateUrgent");

const sameDayCase = runFacts(1785290400000, "2026-07-29T08:00:00.000Z");
assertEqual(sameDayCase.elapsedBizDays, 0, "same-day elapsedBizDays");

process.stdout.write("tracking-inquiry business days: OK\n");
