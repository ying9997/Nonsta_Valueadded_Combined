/**
 * 专家系统共享工具函数
 */

import type { OutputContext } from "./types";

/**
 * 构建 outputContext，自动透传 chainId
 */
export function buildOutputContext(
  expertId: string,
  resultSummary: string,
  chainId?: string
): OutputContext {
  return {
    expertId,
    resultSummary,
    chainId,
  };
}
