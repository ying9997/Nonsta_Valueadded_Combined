# Dashboard workflow node traces

## Background

This local evidence export supports the workflow explainer in
`internal-review-copilot/_runs/20261010_workflow_explainer/`. The goal was to
rerun dashboard orders only from details already available on this machine,
capture pipeline node input/output, and avoid operating on server `40`.

## Result

- dashboardRows: 116
- localDetailsAvailable: 73
- completeNodeTraceCases: 5
- aggregateNodeEvents: 45
- missingLocalDetails: 43
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
