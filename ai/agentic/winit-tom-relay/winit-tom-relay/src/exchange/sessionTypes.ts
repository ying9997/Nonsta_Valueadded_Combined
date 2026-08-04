import type { CookieJarSnapshotV1 } from "winit-tom-adapter";

export interface ExchangeSessionPayloadV1 {
  readonly v: 1;
  readonly jar: CookieJarSnapshotV1;
  readonly tenantId?: string;
  readonly cnomstomBase?: string;
  readonly ordersPage?: string;
  readonly ordersReferer?: string;
}
