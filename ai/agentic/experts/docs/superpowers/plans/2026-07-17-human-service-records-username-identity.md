# Human Service Records Username Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `username` the only required identity and Feishu filter for `human-service-records`.

**Architecture:** Keep the framework-level identity object compatible, but separate optional diagnostic context from the actual lookup key. The lookup node will query Feishu only by `客户邮箱`, while all time, ranking, transcript, and output behavior remains unchanged.

**Tech Stack:** TypeScript, JSON expert manifest/workflow, Markdown documentation, repository script-based tests.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `scripts/test-human-service-records.ts`

- [x] Add a validation case where `username` is present and `customerCode` is absent; assert `canQuery=true`.
- [x] Add source-contract assertions that the Feishu filter contains only the email identity condition and does not require `客户id`.
- [x] Run `npm run test:human-service-records` and confirm the new assertions fail against the current implementation.

### Task 2: Change the identity and query contract

**Files:**
- Modify: `experts/customer/human-service-records/manifest.json`
- Modify: `experts/customer/human-service-records/nodes/validate-input.ts`
- Modify: `experts/customer/human-service-records/nodes/fetch-human-service-records.ts`

- [x] Remove `customerCode` from `x_framework_input_required` and describe it as optional diagnostic context.
- [x] Make validation depend only on non-empty `username` while preserving optional `customerCode` in the identity object.
- [x] Build the Feishu identity filter with `客户邮箱 is username` only.
- [x] Stop requiring, requesting, and returning the Feishu `客户id` field.
- [x] Re-run the expert regression and confirm it passes.

### Task 3: Synchronize durable documentation

**Files:**
- Modify: `experts/customer/human-service-records/design.md`
- Modify: `docs/experts/customer/human-service-records.md`
- Modify: `docs/plan/customer-plan.md`

- [x] Replace the dual-key permission rule with the username/email rule.
- [x] State explicitly that framework `customerCode` and Feishu `客户id` are different identifiers and are not used as a lookup mapping.
- [x] Update acceptance criteria and project status notes without changing unrelated customer-domain plans.

### Task 4: Verify the package

**Files:**
- Verify all files above.

- [x] Run `npm run test:human-service-records`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run check:experts:manifest`.
- [x] Run `npm run check:coze-node-code`.
- [x] Review `git diff --check`, focused diff, and `git status --short`.
