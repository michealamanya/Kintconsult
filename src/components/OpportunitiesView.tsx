import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Flag,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  SupplierMatchResult,
  TenderRecord,
  TenderRequirementRecord,
} from '../types/kint.ts';

interface OpportunitiesViewProps {
  initialTenderId?: number | null;
  openExtractModalExternal?: boolean;
  onCloseExtractModalExternal?: () => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  initialTenderId,
  openExtractModalExternal,
  onCloseExtractModalExternal,
}) => {
  const { apiFetch } = useAuth();
  const [tenders, setTenders] = useState<TenderRecord[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<number | null>(initialTenderId || null);
  const [activeTender, setActiveTender] = useState<TenderRecord | null>(null);
  const [requirements, setRequirements] = useState<TenderRequirementRecord[]>([]);
  const [matches, setMatches] = useState<SupplierMatchResult[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState<Record<number, string>>({});

  // M03 Tender Extraction Modal State
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [rawNoticeText, setRawNoticeText] = useState(
    'UGANDA NATIONAL OIL COMPANY (UNOC) — INVITATION TO BID REF: UNOC-ENG-2026-092\nTitle: Substation & Telemetry Instrumentation Upgrade for Hoima Terminal\nLocation: Hoima District\nDeadline: 2027-01-30\nEstimated Value: USD 1,450,000\nRequirements: Bidders must hold active PAU NSD registration, valid ISO 45001 Safety certification, at least 51% Ugandan equity ownership, and proven Electrical, Instrumentation & Grid Tie-In capability.'
  );
  const [extracting, setExtracting] = useState(false);
  const [extractedDraft, setExtractedDraft] = useState<any | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (openExtractModalExternal) {
      setShowExtractModal(true);
    }
  }, [openExtractModalExternal]);

  const closeModal = () => {
    setShowExtractModal(false);
    setExtractedDraft(null);
    onCloseExtractModalExternal?.();
  };

  const loadTenders = async (preferId?: number | null) => {
    setLoadingTenders(true);
    setError(null);
    try {
      const payload = await apiFetch<{ tenders: TenderRecord[] }>('/api/tenders');
      setTenders(payload.tenders);
      const targetId = preferId || selectedTenderId || payload.tenders[0]?.id || null;
      if (targetId) {
        setSelectedTenderId(targetId);
        await runMatching(targetId);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load procurement opportunities.');
    } finally {
      setLoadingTenders(false);
    }
  };

  const runMatching = async (tenderId: number) => {
    setLoadingMatch(true);
    setError(null);
    try {
      const payload = await apiFetch<{
        tender: TenderRecord;
        requirements: TenderRequirementRecord[];
        matches: SupplierMatchResult[];
      }>(`/api/tenders/${tenderId}/match`);
      setActiveTender(payload.tender);
      setRequirements(payload.requirements);
      setMatches(payload.matches);
    } catch (err: any) {
      setError(err.message || 'Failed to compute supplier matching.');
    } finally {
      setLoadingMatch(false);
    }
  };

  useEffect(() => {
    loadTenders(initialTenderId);
  }, [initialTenderId]);

  const handleSelectTender = (id: number) => {
    setSelectedTenderId(id);
    runMatching(id);
  };

  const handleFeedback = async (
    orgId: number,
    legalName: string,
    labelValue: 'relevant' | 'gap_flagged'
  ) => {
    if (!activeTender) return;
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'supplier_match',
          targetId: `${activeTender.referenceCode}:${legalName}`,
          contextId: activeTender.referenceCode,
          labelValue,
          notes: `Analyst marked ${legalName} as ${labelValue} for ${activeTender.referenceCode}`,
        }),
      });
      setFeedbackSaved((prev) => ({ ...prev, [orgId]: labelValue }));
    } catch (err: any) {
      setError(err.message || 'Could not record feedback label.');
    }
  };

  const handleExtractTender = async () => {
    setExtracting(true);
    setError(null);
    try {
      const payload = await apiFetch<{ draft: any }>('/api/tenders/extract', {
        method: 'POST',
        body: JSON.stringify({ rawText: rawNoticeText }),
      });
      setExtractedDraft(payload.draft);
    } catch (err: any) {
      setError(err.message || 'Tender extraction failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleCommitExtractedTender = async () => {
    if (!extractedDraft) return;
    setCommitting(true);
    setError(null);
    try {
      const payload = await apiFetch<{ tender: TenderRecord }>('/api/tenders', {
        method: 'POST',
        body: JSON.stringify({
          ...extractedDraft,
          sourceName: 'M03 Extracted & Analyst Verified',
        }),
      });
      closeModal();
      await loadTenders(payload.tender.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save tender.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Control Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Procurement Opportunities & Supplier Matching
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic M09 compliance gates paired with M07 supplier-opportunity ranking and explainable gap analysis
          </p>
        </div>
        <button
          onClick={() => setShowExtractModal(true)}
          className="px-4 py-2 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Extract Tender (M03)</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Split Workspace: Tender Selector (4 cols) + Matching Shortlist (8 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs font-semibold text-slate-700">
              Active Tenders ({tenders.length})
            </h2>
          </div>
          {loadingTenders ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tenders.map((t) => {
                const isSelected = t.id === selectedTenderId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTender(t.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>{t.referenceCode}</span>
                      <span className="tabular-nums">${(t.estimatedValueUsd / 1_000_000).toFixed(2)}M</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1 leading-snug">
                      {t.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.buyerOrganisation} · Due {t.deadline}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right: Requirements + Ranked Supplier Matrix */}
        <section className="xl:col-span-8 space-y-5">
          {activeTender && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-mono text-slate-500">
                    {activeTender.referenceCode} · {activeTender.sourceName} · Tier {activeTender.confidenceTier}
                  </p>
                  <h2 className="text-base font-semibold text-slate-900 mt-1">
                    {activeTender.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {activeTender.summary}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xs text-slate-500">Estimated Value</p>
                  <p className="text-base font-mono tabular-nums font-semibold text-slate-900">
                    ${activeTender.estimatedValueUsd.toLocaleString()}
                  </p>
                  <p className="text-xs font-mono text-amber-700 mt-0.5">
                    Deadline {activeTender.deadline}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-800 mb-2">
                  Structured Evaluation Gates ({requirements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-medium ${
                            req.requirementType === 'mandatory'
                              ? 'text-slate-900'
                              : 'text-teal-700'
                          }`}
                        >
                          {req.requirementType === 'mandatory' ? 'Mandatory Gate' : 'Scored Criterion'}
                        </span>
                        <span className="font-mono text-slate-500">Wt {req.weight}%</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-1">{req.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ranked Suppliers Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                M07 / M09 Explainable Supplier Shortlist
              </h3>
              <span className="text-xs text-slate-500">
                Sorted by composite capability & deterministic compliance
              </span>
            </div>

            {loadingMatch ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Select a tender on the left to compute deterministic readiness scores.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {matches.map((m, idx) => (
                  <div key={m.organisationId} className="p-5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                          <span className="text-slate-900 font-semibold">#{idx + 1}</span>
                          <span>·</span>
                          <span>{m.district}</span>
                          <span>·</span>
                          <span>{m.ownershipType} ({m.localContentPct}% UG)</span>
                          <span>·</span>
                          <span>Tier {m.confidenceTier}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">{m.legalName}</h4>
                        <p className="text-xs text-slate-600">{m.explanation}</p>

                        {m.missingMandatory.length > 0 && (
                          <div className="mt-2 text-xs text-red-700 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Missing mandatory: {m.missingMandatory.join('; ')}</span>
                          </div>
                        )}
                        {m.expiringSoon.length > 0 && (
                          <div className="mt-1 text-xs text-amber-700 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Expiring notice: {m.expiringSoon.join('; ')}</span>
                          </div>
                        )}
                        {m.relevantAwardsCount > 0 && (
                          <p className="text-xs font-mono text-teal-700 mt-1">
                            Past track record: {m.relevantAwardsCount} matching contract(s) totaling $
                            {(m.relevantAwardsValueUsd / 1_000_000).toFixed(2)}M
                          </p>
                        )}
                      </div>

                      <div className="flex lg:flex-col items-end justify-between gap-3 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-4">
                            <div>
                              <p className="text-xs text-slate-500">M09 Readiness</p>
                              <p className="text-base font-mono tabular-nums font-semibold text-slate-900">
                                {m.m09ReadinessScore}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">M07 Rank</p>
                              <p className="text-base font-mono tabular-nums font-semibold text-teal-700">
                                {m.m07RankScore}
                              </p>
                            </div>
                          </div>
                          <p
                            className={`text-xs font-semibold mt-1 ${
                              m.complianceStatus === 'Compliant'
                                ? 'text-emerald-700'
                                : m.complianceStatus === 'Conditional Gap'
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            {m.complianceStatus}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {feedbackSaved[m.organisationId] ? (
                            <span className="text-xs font-mono text-emerald-700">
                              Label saved: {feedbackSaved[m.organisationId]}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleFeedback(m.organisationId, m.legalName, 'relevant')
                                }
                                className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-700 rounded hover:bg-slate-100 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Approve Match</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleFeedback(m.organisationId, m.legalName, 'gap_flagged')
                                }
                                className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-700 rounded hover:bg-slate-100 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                <Flag className="w-3 h-3" />
                                <span>Flag Gap</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* M03 Document Extraction Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  M03 Tender Document Extraction & Human Review
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gemini schema-constrained extraction previews structured gates before saving to Cloud SQL
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!extractedDraft ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Paste Procurement Notice / EOI Text
                  </label>
                  <textarea
                    rows={7}
                    value={rawNoticeText}
                    onChange={(e) => setRawNoticeText(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExtractTender}
                    disabled={extracting}
                    className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{extracting ? 'Extracting Schema...' : 'Run M03 Extraction'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <p className="text-xs font-mono text-teal-700">
                    {extractedDraft.referenceCode} · {extractedDraft.sector} · {extractedDraft.category}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900">{extractedDraft.title}</h3>
                  <p className="text-xs text-slate-600">
                    Buyer: {extractedDraft.buyerOrganisation} · Location: {extractedDraft.location} ·
                    Deadline: {extractedDraft.deadline} · Est: $
                    {Number(extractedDraft.estimatedValueUsd).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-700 pt-1">{extractedDraft.summary}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Extracted Requirements ({extractedDraft.requirements.length})
                  </h4>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                    {extractedDraft.requirements.map((req: any, idx: number) => (
                      <div key={idx} className="p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{req.title}</span>
                          <span className="font-mono text-slate-500">
                            {req.requirementType} · {req.category} · {req.weight}%
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{req.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setExtractedDraft(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
                  >
                    Re-edit Text
                  </button>
                  <button
                    onClick={handleCommitExtractedTender}
                    disabled={committing}
                    className="px-4 py-2 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{committing ? 'Committing...' : 'Confirm & Save Tender'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
