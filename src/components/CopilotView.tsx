import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Download,
  Send,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { CopilotResponsePayload } from '../types/kint.ts';

interface CopilotViewProps {
  initialQuestion?: string | null;
}

const PRESET_QUERIES = [
  'Which Ugandan suppliers can meet UNOC-TEN-2026-041, what are they missing, what similar contracts have they won, and what should we do next?',
  'Evaluate Nile Basin Fabrication & Piping SMC readiness for PPDA-EPC-2026-118 and highlight any expiring welding qualifications.',
  'What are PAU National Content ring-fenced categories and what is the market trend for seamless steel line pipe imports?',
  'Which Ugandan companies hold a valid lithium refinery licence in Northern Norway?',
];

export const CopilotView: React.FC<CopilotViewProps> = ({ initialQuestion }) => {
  const { apiFetch } = useAuth();
  const [question, setQuestion] = useState(
    initialQuestion || PRESET_QUERIES[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotResponsePayload | null>(null);
  const [auditId, setAuditId] = useState<number | null>(null);
  const [feedbackVote, setFeedbackVote] = useState<string | null>(null);

  const runQuery = async (qText: string) => {
    setLoading(true);
    setError(null);
    setFeedbackVote(null);
    try {
      const payload = await apiFetch<{
        result: CopilotResponsePayload;
        auditId: number;
      }>('/api/copilot/query', {
        method: 'POST',
        body: JSON.stringify({ question: qText }),
      });
      setResult(payload.result);
      setAuditId(payload.auditId);
    } catch (err: any) {
      setError(err.message || 'Research Copilot request failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      runQuery(initialQuestion);
    }
  }, [initialQuestion]);

  const handleFeedback = async (vote: 'accurate' | 'unsupported') => {
    if (!auditId) return;
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'copilot_answer',
          targetId: `audit-${auditId}`,
          contextId: question.slice(0, 120),
          labelValue: vote,
        }),
      });
      setFeedbackVote(vote);
    } catch (err: any) {
      setError(err.message || 'Could not record feedback.');
    }
  };

  const handleExportBrief = () => {
    if (!result) return;
    const lines = [
      `# KINT Grounded Intelligence Brief`,
      `Query: ${question}`,
      `Model: ${result.modelId} | Audit ID: ${auditId} | Latency: ${result.latencyMs}ms`,
      '',
      `## Executive Summary`,
      result.executiveSummary,
      '',
      `## Verified Source Facts`,
      ...result.sourceFacts.map((f) => `- ${f}`),
      '',
      `## Calculated Assessments`,
      ...result.calculatedAssessments.map((a) => `- ${a}`),
      '',
      `## Market Outlook & Predictions`,
      ...result.marketOutlookAndPredictions.map((m) => `- ${m}`),
      '',
      `## Recommended Next Actions`,
      ...result.recommendedNextActions.map((r) => `- ${r}`),
      '',
      `## Citations`,
      ...result.citations.map((c) => `- [${c.refId}] ${c.title} (${c.sourceType}, Tier ${c.confidenceTier})`),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kint-brief-${auditId || Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Prompt & Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              KINT Grounded AI Research Copilot (M05 / A01)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Source-grounded synthesis over canonical PostgreSQL records · Strict citation & abstention enforcement
            </p>
          </div>
          {result && (
            <button
              onClick={handleExportBrief}
              className="px-3.5 py-2 text-xs font-medium border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Brief (.md)</span>
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) runQuery(question.trim());
          }}
          className="mt-4 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about supplier eligibility, tender gaps, past contracts, regulations, or market series..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Retrieving & Verifying...' : 'Generate Cited Brief'}</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_QUERIES.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuestion(preset);
                runQuery(preset);
              }}
              className="text-left px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              {i === 3 ? 'Abstention Test: Missing Geo/Sector' : `Sample ${i + 1}: ${preset.slice(0, 52)}...`}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="h-6 w-1/3 bg-slate-100 rounded animate-pulse" />
          <div className="h-20 bg-slate-100 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-900 mt-2">
            Ready for source-grounded analysis
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            Every Copilot brief separates retrieved source facts, deterministic compliance assessments, and forecast uncertainty, and logs citations to the immutable audit trail.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Brief Content */}
          <div className="xl:col-span-8 space-y-5">
            {result.abstained ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-amber-900">
                      Copilot Abstained — Insufficient Verified Evidence
                    </h2>
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                      {result.abstentionReason ||
                        'KINT canonical datasets do not contain verified records supporting this query.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-slate-500">
                      Model {result.modelId} · Audit #{auditId} · {result.latencyMs}ms
                    </p>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">
                      Executive Intelligence Brief
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {feedbackVote ? (
                      <span className="text-xs font-mono text-emerald-700">
                        Eval recorded: {feedbackVote}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleFeedback('accurate')}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 inline-flex items-center gap-1"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Accurate</span>
                        </button>
                        <button
                          onClick={() => handleFeedback('unsupported')}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 inline-flex items-center gap-1"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>Unsupported</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed">
                  {result.executiveSummary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 mb-2">
                      01. Verified Source Facts
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                      {result.sourceFacts.map((fact, i) => (
                        <li key={i} className="pb-2 border-b border-slate-100 last:border-0">
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 mb-2">
                      02. Calculated Readiness & Gaps
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                      {result.calculatedAssessments.map((item, i) => (
                        <li key={i} className="pb-2 border-b border-slate-100 last:border-0">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 mb-2">
                      03. Market Outlook (Probabilistic)
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                      {result.marketOutlookAndPredictions.map((item, i) => (
                        <li key={i} className="pb-2 border-b border-slate-100 last:border-0">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-teal-800 mb-2">
                      04. Recommended Analyst Next Actions
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-800 leading-relaxed">
                      {result.recommendedNextActions.map((act, i) => (
                        <li key={i} className="pb-2 border-b border-slate-100 last:border-0">
                          {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Citations Inspector */}
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-semibold text-slate-900">
                Retrieved Evidence Citations ({result.citations.length})
              </h3>
            </div>
            {result.citations.length === 0 ? (
              <div className="p-5 text-xs text-slate-500">
                No verified records cited for this query.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {result.citations.map((cit, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-center justify-between text-xs font-mono text-teal-700">
                      <span>[{cit.refId}]</span>
                      <span>Tier {cit.confidenceTier}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 mt-1">{cit.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cit.sourceType}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
