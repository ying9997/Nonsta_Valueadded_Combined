


Simple Version of Expert Recall

- input the expert_ids from solutions
- fetch the experts metadata from the bitable
- consider how to run the experts job
- build the agent loop and run the experts job
- output any experts output during excution
- orgnize the experts output and return to the main agent

## Session handoff (`sessionHandoff`)

Structured queue memory alongside thin `chainContext`:

- **Shape:** `{ version: 1, chainId: string, steps: Array<{ expertId, at, result: { structured?, analysis? }, outputContext, enrichedContext? }> }` (steps bounded in `post-expert-output`, e.g. max 10).
- **Init:** `check-planner-output` sets `sessionHandoff` with the same `chainId` as `chainContext` and `steps: []`.
- **Append:** `post-expert-output` appends one step per expert completion (optional `enrichedContext` when sub-workflows expose it — phase B).
- **Passthrough:** `post-continue`, `post-abort`, `post-planner-replan` keep `sessionHandoff` aligned with `chainId`.
- **Resolve:** `resolve-next-queue-job` reads `sessionHandoff`, returns it unchanged, and exposes `last_step_result_json` / `last_step_expert_id` for prompts.
- **Baseline + merge:** `build-expert-invoke-baseline` reads **`resolve-next-queue-job.manifest`** and builds `baseline_input_params` (`inputContext.previousOutput` = last step `result`). If the target expert’s manifest sets **`x_recaller_propagate_previous_enriched_context`: `true`** (see [`docs/design-spec.md`](../docs/design-spec.md) §3.1), baseline will pick `enrichedContext` from `sessionHandoff.steps` in reverse order: prefer experts listed in **`x_recaller_enriched_context_preferred_source_experts`** (default `["delivery-status"]`), otherwise fallback to the nearest step carrying `enrichedContext`; then pre-fill **`inputs.enrichedContext`**. `queue-next-job-prepare` fills LLM `input_params`; `merge-queue-input-params` merges with baseline winning on chain fields and `inputs.enrichedContext`, passes **`resolve-next-queue-job.coze_workflow_id`** through as **`workflow_id`**, and exposes flat **`merged_query` / `merged_inputContext` / `merged_inputs`** for subflows or **`call-expert`**.
- **Loop I/O:** `sessionHandoff` is a loop variable like `chainContext` (seed from `check-planner-output`, updated via `set_loop_values` / `post-*`).

## Queue completion (`needsFinalSummary`)

When `resolve-next-queue-job` returns `needsFinalSummary === true` (all task lines `[x]`), skip expert/judge and run:

1. **[`nodes/finalize-queue-handoff.ts`](nodes/finalize-queue-handoff.ts)** — builds `handoff_log_markdown` / `handoff_log_json` (meta + final plan + execution log only; `question` / `solutions` stay external).
2. **[`prompts/queue-user-facing-summary.md`](prompts/queue-user-facing-summary.md)** — LLM node: grounded user reply from `handoff_log_markdown` + `question`; output `reply_to_user` JSON.