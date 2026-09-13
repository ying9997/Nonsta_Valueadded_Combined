export type JsonRecord = Record<string, unknown>;

export type AttachmentStatus = "uploaded" | "missing";

export type OutputPath =
  | "invalid_input"
  | "needs_requirement_clarification"
  | "transfer_human"
  | "needs_field_clarification"
  | "sop_generated";

export type PipelineNode =
  | "validate-input"
  | "context-bind"
  | "check-requirement"
  | "match-template"
  | "check-completeness"
  | "llm-generate-sop"
  | "format-output";

export interface AgentInput {
  mode: "internal_review_copilot";
  vascNo: string;
  query: string;
  customerIntent: string;
  serviceAtom: string;
  sceneKey: string;
  sceneName: string;
  sceneCode: string;
  recommendedVasc: {
    vascCode: string;
    vascName: string;
  };
  pageContext: {
    entryScene: string;
    vaSource: string;
    warehouseCode: string;
    warehouseName: string;
    customerCode: string;
    customerName: string;
    eventNo: string;
    businessOrderNo: string;
    attachmentStatus: Record<string, AttachmentStatus>;
    businessType?: string;
    businessTypeDesc?: string;
  };
  providedFields: Record<string, string>;
  omsFacts: {
    customerRequirementDescription: string;
    requirementBackground: string;
    fieldValues: Record<string, string>;
    attachmentStatus: Record<string, AttachmentStatus>;
    uploadedFiles: Array<{ fileType: string; fileName: string; label: string }>;
  };
  responsiblePeople: {
    submittedBy: string;
    customerService: string[];
    sales: string[];
    reviewers: string[];
  };
  conversationEvidence: string[];
  enrichedContext: JsonRecord;
}

export interface ContextFacts {
  orderNo: string;
  customerCode: string;
  customerName: string;
  warehouseCode: string;
  warehouseName: string;
  eventNo: string;
  businessOrderNo: string;
  allEventNos: string[];
  allBusinessOrderNos: string[];
  vaSource: string;
  /** OMS 订单类型编码：INBOUND / INHOUSE / OUTBOUND / UNUSUAL */
  businessType?: string;
  /** OMS 订单类型描述：入库订单 / 库内订单 / 出库订单 */
  businessTypeDesc?: string;
  sceneKey: string;
  sceneName: string;
  sceneCode: string;
  serviceAtom: string;
  attachmentStatus: Record<string, AttachmentStatus>;
  providedFields: Record<string, string>;
  boundKeys: string[];
}

export interface OwnerFacts {
  submittedBy: string;
  customerService: string[];
  sales: string[];
  reviewers: string[];
}

export interface RequirementCheck {
  complete: boolean;
  missingRequirementItems: string[];
  clarificationPrompts: string[];
  normalizedRequirement: string;
  objectMatch?: string | null;
  objectBoundBypass?: boolean;
  actionMatch?: string | null;
  purposeMatch?: string | null;
  purposeBoundBypass?: boolean;
}

export type MatchDecision = "supported" | "unsupported" | "ambiguous";

export type CandidateConfidence = "high" | "medium" | "low";

export interface MatchCandidate {
  sceneKey: string;
  sceneName: string;
  score: number;
  confidenceScore: number;
  confidence: CandidateConfidence;
  matchedSignals: string[];
  negativeSignals: string[];
  source: string;
  status?: string;
}

export interface MatchQuerySignals {
  text: string;
  interceptHold: boolean;
  hasPhoto: boolean;
  explicitPhotoRequirement: boolean;
  hasRelabel: boolean;
  hasShelve: boolean;
  hasIdentify: boolean;
  hasPackageException: boolean;
  hasPhotoHold: boolean;
  hasDirectScanShelve: boolean;
  weighOrPhotoWithoutRelabel: boolean;
  inboundStockPhoto: boolean;
}

export interface MatchResult {
  matched: boolean;
  supported: boolean;
  category: "B" | "C";
  sceneKey: string;
  scenarioId: string;
  scenarioName: string;
  confidence: CandidateConfidence | "";
  reason: string;
  score: number;
  candidateTemplate: string;
  decision: MatchDecision;
  confidenceScore: number;
  candidates: MatchCandidate[];
  topK: MatchCandidate[];
  querySignals?: MatchQuerySignals;
  gap?: number;
  decisionPath?: string;
  /** Actions extracted from requirement text (action→scene constraint). */
  matchedActions?: string[];
  /** Scene keys boosted by matched actions. */
  actionCandidateScenes?: string[];
  /** Scene keys penalized by matched actions. */
  actionExcludedScenes?: string[];
  /** Phase 2: LLM scene classification payload (when sceneLlm enabled). */
  llmClassification?: {
    matchedScene: string;
    confidence: string;
    reasoning: string;
    /** Card-facing one-liner; max 30 chars. */
    conclusionOneLiner?: string;
    extractedActions: string[];
    alternativeScenes: string[];
    ambiguous: boolean;
    sceneLlmVersion?: 1 | 2 | 3;
    exceptionInfos?: Array<{
      ebNo: string;
      exceptionName: string;
      exceptionObject: string;
      source: string;
    }>;
    toolCallHistory?: Array<{
      round: number;
      toolName: string;
      arguments: Record<string, unknown>;
      result: string;
    }>;
    totalToolRounds?: number;
  };
  /** Phase 2: true when LLM scene classifier was successfully used (not rule fallback). */
  llmUsed?: boolean;
  /** Phase 2: rule prefilter candidate scene keys (not hard-excluded). */
  ruleCandidateScenes?: string[];
  /** BM25 few-shot cases shown to the LLM (score may be < 1.0; prompt only injects ≥ 1.0). */
  retrievedCases?: Array<{
    caseId: string;
    sceneName: string;
    score: number;
    keyAction: string;
  }>;
}

export interface CompletenessResult {
  applicable: boolean;
  complete: boolean;
  missingAttachments: string[];
  missingFields: Array<{ field: string; required: boolean; clarificationPrompt: string }>;
  providedCount: number;
  totalRequired: number;
  sceneKey: string;
}

export interface MockSop {
  requirementBackground: string;
  requirementDescription: string;
  warehouseSop: string;
  sopText: string;
  scenarioName: string;
  fieldsUsed: string[];
  mocked: true;
}

export interface LlmSopDraft {
  requirementBackground: string;
  requirementDescription: string;
  warehouseSop: string;
  sopText: string;
  scenarioName: string;
  fieldsUsed: string[];
  mocked: false;
  model: string;
}

export type GeneratedSop = MockSop | LlmSopDraft;

export interface LlmGeneration {
  text: string;
  model: string;
  mocked: boolean;
  error: string | null;
  sop?: LlmSopDraft;
  reflectionPass?: boolean;
  reflectionIssues?: string[];
  regenerated?: boolean;
}

export interface StructuredReview {
  vascNo: string;
  requirementComplete: boolean;
  missingRequirements: string[];
  sceneMatch: {
    decision: MatchDecision | "";
    topScene: string;
    confidence: number | "";
  };
  materialsComplete: boolean;
  missingMaterials: string[];
  outputPath: OutputPath;
  llmGeneratedText: string;
  transferReason: string | null;
  processingMethod: "暂时";
  riskFlags: string[];
  llmError: string | null;
}

export type CaseStatus =
  | "pending"
  | "first_assessed"
  | "clarification_sent"
  | "awaiting_reply"
  | "reply_received"
  | "reassessed"
  | "sop_ready"
  | "sop_editing"
  | "written_back"
  | "transferred"
  | "awaiting_scene_confirm"
  | "scene_confirmed";

export interface SceneCandidate {
  index: number;
  sceneKey: string;
  sceneName: string;
}

export interface CaseRecord {
  vascNo: string;
  status: CaseStatus;
  customer: string;
  warehouse: string;
  salesRep: string;
  csRep: string;
  omsAuditStatus: string;
  aiOutputPath: string;
  aiGeneratedText: string;
  /** LLM 分段结果；写 OMS / 绿卡优先用它，aiGeneratedText 仍存全文。 */
  llmSop?: LlmSopDraft | null;
  matchResult: object;
  missingFields: string[];
  feishuThreadId: string | null;
  clarificationSentAt: string | null;
  replyReceivedAt: string | null;
  lastProcessedAt: string;
  createdAt: string;
  updatedAt: string;
  reminderSentAt?: string | null;
  reviewRemark?: string;
  llmError?: string | null;
  ruleOutputPath?: string;
  riskFlags?: string[];
  processingMethod?: "暂时";
  confirmedScene?: string;
  confirmedSceneName?: string;
  confirmedBy?: string;
  sceneCandidateList?: SceneCandidate[];
  lastSceneReplyText?: string;
  notifyChannel?: "card" | "post";
  feishuMessageId?: string | null;
  lastCard?: object | null;
  /** 已完成的 SOP 修订次数；第 4 次点「需修改」转人工。 */
  sopEditCount?: number;
  /** 最近一次点「SOP 需修改」的时间，用来过滤之后的话题回复。 */
  sopEditRequestedAt?: string | null;
  lastSopEditInstruction?: string;
  /** writeDraft 已调用次数（含失败）。 */
  omsWriteAttempts?: number;
  /** 审核员点「重试写入 OMS」的次数。 */
  omsWriteManualRetries?: number;
}
