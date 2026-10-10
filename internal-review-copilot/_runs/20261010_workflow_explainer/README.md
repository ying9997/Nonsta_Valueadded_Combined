# Workflow explainer run summary

Date: 2026-10-10

## Background

This run was created after reviewing the local quality dashboard for the
internal review copilot. The dashboard is used to evaluate early gray-release
quality for the non-standard value-added review agent, especially whether the
agent can improve first-pass acceptance, audit closure, and future
AI-independent completion rates.

The user narrowed the execution scope to local-only evidence:

- Use the current orders already present in the local dashboard.
- Do not regenerate every order from remote systems.
- Do not operate on server `40`.
- Rerun only cases whose OMS detail already exists on this machine.
- Preserve each workflow node's raw input and output so later badcase analysis can drill down from KPI to node-level evidence.

## Artifacts

- `workflow-explainer.html`: visual map of the current internal-review-copilot workflow, including rule, LLM, knowledge, external data, and human-review boundaries.
- `prompt-dump.md`: prompt inventory for runtime LLM nodes, including scene classification, L2.5 completeness, SOP generation, reflection, clarification, transfer-human, and reply summarization prompts.
- `../20261010_dashboard_node_traces/`: local rerun evidence for dashboard orders with node-level traces.

## Execution Result

The workflow trace exporter scanned the dashboard snapshot and local run files:

- Dashboard rows: 116
- Rows with local OMS detail available: 73
- Rows with complete node traces captured in this artifact set: 5
- Dashboard rows missing local detail: 43
- Aggregated node events: 45
- Cases with a recorded failure gate: 1

The complete trace cases are `VASC000000370932`, `VASC000000370947`,
`VASC000000383394`, `VASC000000383727`, and `VASC000000386808`. Successful cases
reach `sop_generated` with this node path:

`validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output`

The full raw node input/output is preserved in:

- `../20261010_dashboard_node_traces/cases/VASC000000370947/trace.json`
- `../20261010_dashboard_node_traces/workflow-node-traces.jsonl`

Some `sku-consistency-check` nodes recorded partial results because the local
rerun did not have permission for OMS event-order lookups. That limitation is
part of the captured node output and was not bypassed by calling server `40`.

## Reproduction

From `internal-review-copilot/`:

```powershell
npx tsx scripts/export-dashboard-node-traces.ts --out=_runs/20261010_dashboard_node_traces --limit=1
```

The exporter reads `dashboard/data.js`, searches local run files for matching OMS details, and writes the dashboard order snapshot, missing-detail list, case index, raw per-case traces, and aggregate JSONL trace events.
