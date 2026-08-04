---
name: lookup-order-customer
description: Look up the Winit customer identity behind an order or business identifier and return customerCode, customerName, and username. Use when Henry provides an inbound, outbound, value-add, booking, ISP, return, transport, transfer, exception, claim, POD, tracking, package, seller, or customer order identifier and asks who owns it, needs customer context for an expert workflow, or needs real-data test preparation. Inspect TOM read-only with the configured IAM account, preserve unsupported order types as explicit gaps, and ask for customerCode, customerName, and username when identity cannot be verified.
---

# Lookup Order Customer

Return a verified identity triple for one supplied identifier:

```text
customerCode: ...
customerName: ...
username: ...
```

Treat this as a reverse-lookup task. `WINIT_IAM_USERNAME` is only the internal TOM login and is never the result `username`.

## Read before querying

1. Treat the repository root as the working directory and read the current root `AGENTS.md`.
2. Read [references/order-types.md](references/order-types.md) for the current coverage and gaps.
3. Read [references/tom-query-map.md](references/tom-query-map.md) before a live TOM lookup.
4. Run `node .agents/skills/lookup-order-customer/scripts/route-order.mjs <identifier>` to obtain candidate routes. Do not assume a prefix is globally unique.

## Lookup workflow

### 1. Normalize the input

- Trim surrounding whitespace and preserve the original identifier.
- Accept one identifier per lookup. When several are supplied, process them independently and never reuse one order's identity for another.
- Use the router result as a search plan, not proof of the order type.
- If the identifier is ambiguous, try all applicable read-only routes in the documented order until exactly one business record matches.

### 2. Query TOM read-only

Use the `agent-browser` skill. Load its current core instructions before the first browser command.

- Load `TOM_BASE_URL`, `WINIT_IAM_USERNAME`, and `WINIT_IAM_PASSWORD` from the repository `.env` without printing them.
- Open a dedicated browser session and log in through IAM only when the session is unauthenticated.
- Navigate to the route and select the search label recorded in `references/tom-query-map.md`.
- Submit only a read-only list/detail query. Never invoke create, modify, cancel, approve, export, retry, billing, or batch-operation controls.
- Read the raw DataTable row when possible; hidden fields may contain customer identity even when the visible table omits them.
- Require an exact identifier match. A fuzzy result, date-filtered list, or HTTP 200 without a matching row is not success.
- Close the dedicated browser session after the lookup. Do not save cookies, HAR files, screenshots, or response bodies containing customer data unless Henry explicitly requests evidence artifacts.

### 3. Resolve the username

Use TOM customer management at `/Customers/customer` after obtaining at least one identity key.

- Prefer an exact `customerCode` lookup through `ums.CustomerService_pageCustomers`.
- Map the returned fields as `code -> customerCode`, `name -> customerName`, and `email -> username`.
- When the source record exposes only `username`/`userName`, search the customer list by account name and recover the code and name.
- When only `customerName` is available, accept it only if the customer search returns exactly one exact-name record. Otherwise treat it as unresolved.
- Verify that all three values belong to the same customer row. Do not combine fields from separate candidates.

### 4. Validate the result

Return success only when:

- the order/business identifier matched exactly one source record;
- `customerCode`, `customerName`, and `username` are all non-empty;
- the customer list confirms the triple belongs together.

Report the matched order type and evidence boundary in one short sentence. Redact unrelated phone, address, credential, ID-document, token, signed-URL, and contact data.

### 5. Use the fallback

If no route matches, a route is marked `gap`, multiple customer rows remain, permissions fail, or any identity field cannot be verified, do not guess. Ask Henry for:

```text
customerCode:
customerName:
username:
```

State the failed identifier, attempted order types, and the specific missing or conflicting field. Do not use `COZE_WINIT_*` defaults as though they belonged to the supplied order.

## Coverage maintenance

Run this audit whenever the repository adds or changes an order-related expert, workflow input, TOM route, or identifier:

```text
node .agents/skills/lookup-order-customer/scripts/audit-order-types.mjs
```

If it reports an uncovered identifier:

1. inspect the current expert manifest, workflow, nodes, prompts, and related docs;
2. verify a read-only TOM or internal interface and its returned customer fields;
3. update `references/order-types.json`, `references/order-types.md`, and `references/tom-query-map.md`;
4. add router regression cases;
5. keep the new type as `gap` until a unique identity triple is actually verifiable.

Never mark a type supported from its name, menu presence, or HTTP success alone.
