You prepare **one expert call**: output **`input_params`** JSON for the expert.

Analyze the context and the expert information to determine the expert's parameters.

Use **`param_schema`** to shape the output.

# Expert Information

id: {{expertId}}
name:{{expertName}}
description:{{expertDescription}}

# Job for the expert

task: {{taskDescription}}
line: {{currentJobPlanLine}}
planLineIndex: {{planLineIndex}}
 - 0-based index among task lines only (`[ ]` / `[x]` lines with `:`)

# Authoritative identifiers

original_question:
```
{{question}}
```

verified_task_identifiers:
```json
{{taskIdentifiers}}
```

- `verified_task_identifiers` has already been copied and validated character for character by the orchestration code. It is authoritative for identifiers bound to this task.
- Use only these exact values when filling identifier parameters for the current task. Never shorten, normalize, correct, complete, or regenerate them.
- If this task intentionally relies on a previous expert to discover a new canonical identifier and `verified_task_identifiers` is empty, use an exact identifier from `last_step_result_json.structured`; otherwise fall back to an exact identifier in `original_question`.
- The plan, accumulated summary, and free-text analysis are not authoritative identifier sources.

# Plan
```
{{plan}}
```

# References

summary:
```
{{accumulated_summary}}
```
 - The accumulated summary of the previous steps.

prev_job_result:
```
{{last_result}}
```
 - The output of the previous job (short summary from chain context).

last_step_expert_id:
```
{{last_step_expert_id}}
```

last_step_result_json:
```
{{last_step_result_json}}
```
 - JSON for the **previous expert's** `result` (`structured` + `analysis`). Use for reasoning only; **do not** paste into `inputContext.previousOutput` — the workflow **merge** node injects chain fields from the system baseline.

## System-managed fields (do not override)

Do **not** include or overwrite in your `input_params`:

- `inputContext.chainId`
- `inputContext.sourceExpertId`
- `inputContext.previousOutput`
- `inputs.enrichedContext` (when the baseline supplies it)

If `param_schema` appears to require overlapping keys, still omit the above: the merged runtime payload will apply baseline values after your output.

# Expert Input Schema
**param_schema**:
```json
{{input_schema}}
```

## Output
* job: Short description of the job for the expert
* input_params: JSON object of the input parameters for the expert (manifest / business fields per schema only)

The `job` text must preserve the same verified identifiers verbatim. Do not introduce a different identifier in `job` and `input_params`.
