Planner prompts are split by phase:

- **First plan**: [`queue-planner-initial.md`](./queue-planner-initial.md) — no prior list to preserve; all new lines are `[ ]`.
- **Re-plan**: [`queue-planner-replan.md`](./queue-planner-replan.md) — must keep all `[x]` lines unchanged; edit only pending lines and append as needed; bind `current_job_list`, optional `replan_reason` / `planner_brief` / `accumulated_summary`.

Coze: use two LLM nodes (or two prompt templates) and branch from orchestration / `llm-judge` (`replan` → replanner, else initial only at session start).
