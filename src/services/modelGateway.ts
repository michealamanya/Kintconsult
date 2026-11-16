import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface CopilotContextData {
  organisations: Array<{
    id: number;
    legalName: string;
    sector: string;
    subsector: string;
    district: string;
    localContentPct: number;
    pauNsdNumber: string | null;
    pauNsdStatus: string;
    confidenceTier: string;
    verificationStatus: string;
    provenanceSource: string;
    capabilities: string[];
    certifications: Array<{ certType: string; status: string; validTo: string }>;
  }>;
  tenders: Array<{
    id: number;
    referenceCode: string;
    title: string;
    buyerOrganisation: string;
    category: string;
    deadline: string;
    estimatedValueUsd: number;
    requirements: Array<{ title: string; requirementType: string }>;
  }>;
  awards: Array<{
    id: number;
    tenderReference: string;
    title: string;
    winningProviderName: string;
    category: string;
    contractValueUsd: number;
    awardDate: string;
  }>;
  documents: Array<{
    id: number;
    code: string;
    title: string;
    sourceName: string;
    confidenceTier: string;
    contentText: string;
  }>;
  commodityTrends: Array<{
    code: string;
    name: string;
    unit: string;
    importSubstitutionGapScore: number;
    latestActual?: { periodDate: string; value: number };
    latestForecast?: { periodDate: string; value: number; lowerBound: number | null; upperBound: number | null };
  }>;
}

export interface CopilotStructuredResponse {
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

export async function runGroundedResearchCopilot(
  question: string,
  context: CopilotContextData
): Promise<CopilotStructuredResponse> {
  const start = Date.now();
  const modelId = 'gemini-4-hydrogen';

  const systemInstruction = `You are KINT Research Copilot (Model M05 / Agent A01), an institutional industrial intelligence analyst for Uganda's petroleum, energy, and minerals sectors.

STRICT GOVERNANCE & GROUNDING RULES (NON-NEGOTIABLE):
1. Only cite records explicitly provided in the KINT KNOWLEDGE CONTEXT JSON below. NEVER invent suppliers, contract values, licence numbers, regulations, or external URLs.
2. Distinguish clearly between:
   - Source Facts (directly verified from KINT records with citation tags like [ORG-1], [TEN-UNOC-TEN-2026-041], [AWD-1], [DOC-PAU-NC-2025], [COM-BRENT-USD])
   - Calculated Assessments (compliance pass/fail, missing certifications, local-content thresholds)
   - Market Outlook & Predictions (clearly labeled as model forecasts with uncertainty ranges, never presented as deterministic facts).
3. ABSTENTION RULE: If the user asks about a topic, country, company, or dataset completely absent from the KINT KNOWLEDGE CONTEXT, set abstained=true, explain exactly what evidence is missing in abstentionReason, and leave sourceFacts empty rather than hallucinating.
4. Keep prose crisp, analytical, and audit-ready.`;

  const prompt = `USER QUESTION:
${question}

KINT KNOWLEDGE CONTEXT (PostgreSQL Canonical Records):
${JSON.stringify(context, null, 2)}`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          abstained: {
            type: Type.BOOLEAN,
            description: 'True only if the KINT knowledge context lacks sufficient evidence to answer the question reliably.',
          },
          abstentionReason: {
            type: Type.STRING,
            description: 'If abstained is true, explain what verified data is missing. Empty string otherwise.',
          },
          executiveSummary: {
            type: Type.STRING,
            description: 'Concise 2-3 sentence executive synthesis answering the core question with inline citation codes.',
          },
          sourceFacts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Direct facts verified from provided records, each ending with a citation tag e.g. [ORG-1] or [DOC-PAU-NC-2025].',
          },
          calculatedAssessments: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Deterministic readiness/compliance gaps, missing documents, or supplier eligibility evaluations.',
          },
          marketOutlookAndPredictions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Forecast trends or import-substitution insights with explicit uncertainty bounds.',
          },
          recommendedNextActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Actionable human-in-the-loop next steps for the analyst or buyer.',
          },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                refId: { type: Type.STRING },
                title: { type: Type.STRING },
                sourceType: { type: Type.STRING },
                confidenceTier: { type: Type.STRING },
              },
              required: ['refId', 'title', 'sourceType', 'confidenceTier'],
            },
          },
        },
        required: [
          'abstained',
          'abstentionReason',
          'executiveSummary',
          'sourceFacts',
          'calculatedAssessments',
          'marketOutlookAndPredictions',
          'recommendedNextActions',
          'citations',
        ],
      },
    },
  });

  const latencyMs = Date.now() - start;
  const parsed = JSON.parse((response.text ?? '{}').trim());

  return {
    abstained: Boolean(parsed.abstained),
    abstentionReason: parsed.abstentionReason || null,
    executiveSummary: parsed.executiveSummary || 'No summary generated.',
    sourceFacts: Array.isArray(parsed.sourceFacts) ? parsed.sourceFacts : [],
    calculatedAssessments: Array.isArray(parsed.calculatedAssessments)
      ? parsed.calculatedAssessments
      : [],
    marketOutlookAndPredictions: Array.isArray(parsed.marketOutlookAndPredictions)
      ? parsed.marketOutlookAndPredictions
      : [],
    recommendedNextActions: Array.isArray(parsed.recommendedNextActions)
      ? parsed.recommendedNextActions
      : [],
    citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    modelId,
    latencyMs,
  };
}

export interface ExtractedTenderDraft {
  referenceCode: string;
  title: string;
  buyerOrganisation: string;
  sector: string;
  category: string;
  location: string;
  deadline: string;
  estimatedValueUsd: number;
  summary: string;
  requirements: Array<{
    requirementType: 'mandatory' | 'scored';
    category: 'certification' | 'capability' | 'registration' | 'local_content';
    title: string;
    description: string;
    requiredCertType: string | null;
    requiredCapabilityCode: string | null;
    minLocalContentPct: number | null;
    weight: number;
  }>;
}

export async function extractTenderFromText(rawText: string): Promise<ExtractedTenderDraft> {
  const modelId = 'gemini-4-hydrogen';

  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Extract structured procurement tender metadata and requirements from the following tender notice. Map capability codes if relevant from: CAP-LOG-HVY (Heavy Haulage), CAP-WLD-FAB (ASME Fabrication), CAP-HSE-ENV (Environmental/Waste), CAP-CIV-EWC (Civil Works), CAP-PWR-MNT (Electrical/SCADA), CAP-GEO-LAB (Geotech/Assay). Return realistic defaults only for missing formatting, never fabricate certifications not implied by the text.

TENDER NOTICE:
${rawText}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          referenceCode: { type: Type.STRING },
          title: { type: Type.STRING },
          buyerOrganisation: { type: Type.STRING },
          sector: { type: Type.STRING },
          category: { type: Type.STRING },
          location: { type: Type.STRING },
          deadline: { type: Type.STRING, description: 'YYYY-MM-DD' },
          estimatedValueUsd: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          requirements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                requirementType: { type: Type.STRING },
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                requiredCertType: { type: Type.STRING },
                requiredCapabilityCode: { type: Type.STRING },
                minLocalContentPct: { type: Type.NUMBER },
                weight: { type: Type.NUMBER },
              },
              required: ['requirementType', 'category', 'title', 'description', 'weight'],
            },
          },
        },
        required: [
          'referenceCode',
          'title',
          'buyerOrganisation',
          'sector',
          'category',
          'location',
          'deadline',
          'estimatedValueUsd',
          'summary',
          'requirements',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    referenceCode: parsed.referenceCode || `KINT-EXT-${Date.now().toString().slice(-4)}`,
    title: parsed.title || 'Extracted Procurement Notice',
    buyerOrganisation: parsed.buyerOrganisation || 'Unspecified Operator',
    sector: parsed.sector || 'Petroleum',
    category: parsed.category || 'Logistics & Transport',
    location: parsed.location || 'Hoima / Albertine Basin',
    deadline: parsed.deadline || '2027-02-15',
    estimatedValueUsd: Number(parsed.estimatedValueUsd || 1000000),
    summary: parsed.summary || '',
    requirements: Array.isArray(parsed.requirements)
      ? parsed.requirements.map((r: any) => ({
          requirementType: r.requirementType === 'scored' ? 'scored' : 'mandatory',
          category: ['certification', 'capability', 'registration', 'local_content'].includes(r.category)
            ? r.category
            : 'certification',
          title: r.title || 'Requirement',
          description: r.description || '',
          requiredCertType: r.requiredCertType || null,
          requiredCapabilityCode: r.requiredCapabilityCode || null,
          minLocalContentPct:
            typeof r.minLocalContentPct === 'number' && r.minLocalContentPct > 0
              ? r.minLocalContentPct
              : null,
          weight: Number(r.weight || 25),
        }))
      : [],
  };
}
