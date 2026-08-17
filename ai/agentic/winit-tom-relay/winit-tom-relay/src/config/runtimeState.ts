import type { SessionStore } from "../sessionStore/types.js";
import type { TenantCredentials } from "../tenants/loadCredentials.js";

export type RuntimeState =
  | { readonly kind: "single"; readonly sessionStoreForExchange?: SessionStore }
  | {
      readonly kind: "multi";
      readonly keyToTenant: Map<string, string>;
      readonly tenants: Map<string, TenantCredentials>;
      readonly sessionStore: SessionStore;
    };

let state: RuntimeState = { kind: "single" };

export function getRuntimeState(): RuntimeState {
  return state;
}

export function setRuntimeState(next: RuntimeState): void {
  state = next;
}
