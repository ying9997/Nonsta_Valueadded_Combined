/** 与 Redis get / setEx / del 等价的窄接口（逻辑键由调用方生成，如 `winit-tom-relay:session:*`）。 */
export interface SessionStore {
  get(logicalKey: string): Promise<string | null>;
  setWithTtl(logicalKey: string, value: string, ttlSec: number): Promise<void>;
  del(logicalKey: string): Promise<void>;
}
