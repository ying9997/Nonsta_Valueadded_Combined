/**
 * Fixture JSON for `test:expert:online`.
 * `parameters` is sent as Coze `workflow/run` parameters (top-level), same as call-expert.ts.
 */

export interface FixtureFile {
  expert_id?: string;
  parameters: Record<string, unknown>;
  expect?: ExpectBlock;
}

/** Soft assertions on expert output (after extractExpertOutputShape). */
export interface ExpectBlock {
  outputContext?: {
    expertId?: string;
    resultSummary?: { minLength?: number; includes?: string; regex?: string };
    chainId?: string;
  };
  analysis?: { minLength?: number; includes?: string; regex?: string };
  /** Keys that must exist on structured (value may be any). */
  structuredKeys?: string[];
  /** Path "a.b.c" must exist and be non-null / non-undefined. */
  structuredPaths?: string[];
}

export interface RegistryRowResolved {
  expert_id: string;
  ver: string;
  coze_workflow_id: string;
  release_id: string;
}

export interface ExpertRunResult {
  structured: Record<string, unknown>;
  analysis: string;
  outputContext: {
    expertId: string;
    resultSummary: string;
    chainId: string;
  };
  enrichedContext?: Record<string, unknown>;
  coze_code: number | string;
  coze_msg: string;
  debug_url?: string;
  execute_id?: string;
}
