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
  | "written_back"
  | "transferred";

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
}
