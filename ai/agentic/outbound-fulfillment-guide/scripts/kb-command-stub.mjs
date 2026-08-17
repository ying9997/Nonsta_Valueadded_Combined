import {
  CONTRACT_VERSION,
  REPORT_SCHEMA_REFERENCE,
  TOOL_VERSION,
  computeAuthorityDigest,
  createSummary,
  detectPhase0BusinessContent,
  readStartedFromCommit,
  reportPathForCommand,
  sortReportItems,
  writeCommandReport
} from "./lib/command-report.mjs";

const SUPPORTED_STUB_COMMANDS = new Set([
  "kb:inventory",
  "kb:generate",
  "kb:index",
  "kb:coverage",
  "kb:test",
  "kb:build-release",
  "kb:verify-release"
]);

async function main() {
  const requestedCommand = process.argv[2] || "";
  const isKnownCommand = SUPPORTED_STUB_COMMANDS.has(requestedCommand);
  const command = isKnownCommand ? requestedCommand : "kb:unknown";
  const reportRelativePath = reportPathForCommand(command);
  const digestBefore = await computeAuthorityDigest();
  const businessCategories = await detectPhase0BusinessContent();
  const startedFromCommit = readStartedFromCommit();

  const checks = [
    {
      check_id: "command-capability",
      status: "skipped",
      message: isKnownCommand
        ? "该命令在 Phase 0 尚未实现。"
        : "命令标识不在声明的 Phase 0 能力集中。"
    }
  ];
  const errors = [
    {
      code: isKnownCommand ? "CAPABILITY_NOT_IMPLEMENTED" : "UNKNOWN_COMMAND",
      message: isKnownCommand
        ? "未执行任何业务读取、生成、测试或发布操作。"
        : "未执行未知命令。"
    }
  ];
  const warnings = [];
  if (process.argv.length > 3) {
    warnings.push({ code: "ARGUMENTS_NOT_CONSUMED", message: "Phase 0 stub 未读取或持久化命令参数。" });
  }
  if (command === "kb:verify-release") {
    warnings.push({
      code: "VERIFY_REPORT_CONTRACT_NOT_IMPLEMENTED",
      message: "正式校验包及显式包外报告参数契约尚未实现。"
    });
  }

  const digestAfter = await computeAuthorityDigest();
  const exitCode = isKnownCommand ? 3 : 2;
  const status = isKnownCommand ? "not_implemented" : "invalid_invocation";
  const sortedChecks = sortReportItems(checks);
  const sortedErrors = sortReportItems(errors);
  const sortedWarnings = sortReportItems(warnings);
  const report = {
    $schema: REPORT_SCHEMA_REFERENCE,
    contract_version: CONTRACT_VERSION,
    command,
    tool_version: TOOL_VERSION,
    input_digest: digestBefore,
    started_from_commit: startedFromCommit,
    status,
    exit_code: exitCode,
    validation_profile: "phase0-skeleton",
    business_content_status: businessCategories.length > 0 ? "non_empty" : "empty",
    full_business_validation_available: false,
    clone_ready: false,
    release_ready: false,
    summary: createSummary(sortedChecks, sortedErrors, sortedWarnings),
    checks: sortedChecks,
    errors: sortedErrors,
    warnings: sortedWarnings,
    written_paths: [reportRelativePath],
    mutation_guard: {
      authoritative_inputs_modified: digestBefore !== digestAfter,
      business_outputs_written: false,
      allowed_report_path: reportRelativePath,
      input_digest_before: digestBefore,
      input_digest_after: digestAfter
    }
  };

  await writeCommandReport(report, reportRelativePath);
  process.stdout.write(`${status.toUpperCase()} ${command} report=${reportRelativePath}\n`);
  process.exitCode = exitCode;
}

main().catch(() => {
  process.stderr.write("INTERNAL_ERROR kb-command-stub code=STUB_EXECUTION_FAILED\n");
  process.exitCode = 70;
});
