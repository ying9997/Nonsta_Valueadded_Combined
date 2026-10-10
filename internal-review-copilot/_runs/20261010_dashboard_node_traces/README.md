# Dashboard workflow node traces

## Background

This local evidence export supports the workflow explainer in
`internal-review-copilot/_runs/20261010_workflow_explainer/`. The goal was to
rerun dashboard orders only from details already available on this machine,
capture pipeline node input/output, and avoid operating on server `40`.

## Why this log exists

Badcase optimization cannot rely only on final dashboard metrics such as scene
match rate or SOP edit rate. Those metrics tell us that a case was wrong, but
not where it became wrong. To improve the agent in a measurable way, each
badcase needs a replayable execution trace:

- what the original OMS detail looked like before the agent transformed it;
- which node consumed which facts and produced which decision;
- whether the miss came from rule gating, scene retrieval/ranking, L2.5
  completeness, SKU checks, LLM SOP generation, or final formatting;
- what external dependency failed or degraded during the run;
- how the node result connects back to dashboard outcomes such as scene edited,
  SOP edited, WI edited, or one-pass acceptance.

This is the missing layer between the quality dashboard and concrete fixes.
The dashboard is useful for detecting metric movement; node-level logs make the
movement attributable. Without this trace, a badcase review usually collapses
into reading only the final SOP and guessing whether to tune prompts, scenario
cards, rules, retrieval, or input extraction. With this trace, we can build a
closed loop:

1. dashboard finds a failing or low-confidence slice;
2. node trace shows the first wrong intermediate decision;
3. the fix targets that layer only;
4. the same case is replayed to confirm the node changed as intended;
5. aggregate dashboard metrics verify whether the fix generalized.

The logs here are intentionally local evidence artifacts. They may contain
customer/order details from OMS inputs, so they should be treated as debugging
evidence rather than product documentation.

## Result

- dashboardRows: 116
- localOrderNoMatches: 73
- completeOmsDetailsAvailable: 5
- completeNodeTraceCases: 5
- aggregateNodeEvents: 45
- missingRunnableLocalDetails: 111
- casesWithFailureGate: 1
- skipLlm: false

The complete node traces captured here are:

- `VASC000000370932`
- `VASC000000370947`
- `VASC000000383394`
- `VASC000000383727`
- `VASC000000386808`

Successful cases finish at `sop_generated` after these nodes:

`validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output`

Some `sku-consistency-check` nodes returned partial output because the local
account lacked permission for OMS event-order lookups. The permission limitation
is preserved in the raw trace instead of being filled from remote server data.

Important interpretation detail: 73 dashboard order numbers appeared in local
files, but most of those local files were lightweight analysis rows, not full
OMS detail objects. Only 5 had the runnable shape required by `runPipeline`
(`orderNo`, `listHeader`, `atoms`, and `events`). The remaining dashboard cases
are listed as missing runnable local detail rather than being replayed from
incomplete input.

## Files

- `case-index.json`: one row per complete traced case with compact result and trace file path.
- `workflow-node-traces.jsonl`: all captured node trace events in one JSONL file.
- `cases/<VASC>/trace.json`: raw node input/output for a single traced case.
- `cases/<VASC>/input-detail.json`: local OMS detail used for rerun.
- `missing-details.json`: dashboard cases that cannot be rerun from local files yet.

## Reproduction

Run from `internal-review-copilot/` to create a fresh bounded trace export:

```powershell
npx tsx scripts/export-dashboard-node-traces.ts --out=_runs/20261010_dashboard_node_traces --limit=1
```

Use `--skip-llm` for a fast structural smoke test. Omit it when the goal is to
inspect the real LLM SOP-generation node input/output.
