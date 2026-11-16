export interface KintUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  organisationScope: string;
}

export interface OrganisationCapability {
  id: number;
  code: string;
  name: string;
  parentCategory: string;
  evidenceSummary: string;
  equipmentNotes: string | null;
  capacityMetric: string | null;
  confidenceTier: string;
  verified: boolean;
}

export interface CertificationRecord {
  id: number;
  certType: string;
  issuer: string;
  referenceNumber: string;
  status: string;
  validFrom: string;
  validTo: string;
  scope: string;
  provenanceSource: string;
}

export interface AwardRecord {
  id: number;
  tenderReference: string;
  title: string;
  buyerOrganisation: string;
  winningOrganisationId: number | null;
  winningProviderName: string;
  sector: string;
  category: string;
  contractValueUsd: number;
  awardDate: string;
  status: string;
  provenanceSource: string;
}

export interface OrganisationRecord {
  id: number;
  legalName: string;
  aliases: string[];
  orgRole: string;
  sector: string;
  subsector: string;
  district: string;
  country: string;
  ownershipType: string;
  localContentPct: number;
  pauNsdNumber: string | null;
  pauNsdStatus: string;
  website: string | null;
  confidenceTier: string;
  provenanceSource: string;
  provenanceUrl: string | null;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  capabilities: OrganisationCapability[];
  certifications: CertificationRecord[];
  awards: AwardRecord[];
}

export interface TenderRequirementRecord {
  id: number;
  tenderId: number;
  requirementType: string;
  category: string;
  title: string;
  description: string;
  requiredCertType: string | null;
  requiredCapabilityCode: string | null;
  minLocalContentPct: number | null;
  weight: number;
}

export interface TenderRecord {
  id: number;
  referenceCode: string;
  title: string;
  buyerOrganisation: string;
  sector: string;
  category: string;
  location: string;
  deadline: string;
  estimatedValueUsd: number;
  status: string;
  summary: string;
  sourceName: string;
  sourceUrl: string | null;
  confidenceTier: string;
  requirements?: TenderRequirementRecord[];
}

export interface SupplierMatchResult {
  organisationId: number;
  legalName: string;
  district: string;
  ownershipType: string;
  localContentPct: number;
  pauNsdNumber: string | null;
  pauNsdStatus: string;
  confidenceTier: string;
  verificationStatus: string;
  m09ReadinessScore: number;
  m07RankScore: number;
  complianceStatus: 'Compliant' | 'Conditional Gap' | 'Non-Compliant';
  passedRequirements: string[];
  missingMandatory: string[];
  expiringSoon: string[];
  capabilityMatches: string[];
  relevantAwardsCount: number;
  relevantAwardsValueUsd: number;
  explanation: string;
}

export interface EventProposalRecord {
  id: number;
  eventType: string;
  severity: string;
  title: string;
  description: string;
  entityType: string | null;
  entityId: number | null;
  agentId: string | null;
  modelId: string | null;
  payloadJson: Record<string, unknown> | null;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actorUid: string;
  actorEmail: string;
  actorType: string;
  agentId: string | null;
  modelId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  inputsSummary: Record<string, unknown> | null;
  outputsSummary: Record<string, unknown> | null;
  sourceRefs: string[] | null;
  createdAt: string;
}

export interface FeedbackLabelRecord {
  id: number;
  userUid: string;
  targetType: string;
  targetId: string;
  contextId: string | null;
  labelValue: string;
  notes: string | null;
  createdAt: string;
}

export interface CopilotResponsePayload {
  abstained: boolean;
  abstentionReason: string | null;
  executiveSummary: string;
  sourceFacts: string[];
  calculatedAssessments: string[];
  marketOutlookAndPredictions: string[];
  recommendedNextActions: string[];
  citations: Array<{
    refId: string;
    title: string;
    sourceType: string;
    confidenceTier: string;
  }>;
  modelId: string;
  latencyMs: number;
}
