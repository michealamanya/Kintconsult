import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AuditLogRecord,
  AwardRecord,
  EventProposalRecord,
  TenderRecord,
} from '../types/kint.ts';

interface OverviewPayload {
  kpis: {
    verifiedSuppliersCount: number;
    totalSuppliersCount: number;
    openTendersCount: number;
    totalOpenTenderValueUsd: number;
    openProposalsCount: number;
    expiringCertsCount: number;
    feedbackLabelsCount: number;
    historicalAwardsCount: number;
  };
  priorityTenders: TenderRecord[];
  openEvents: EventProposalRecord[];
  recentAwards: AwardRecord[];
  recentAudit: AuditLogRecord[];
}

interface OverviewViewProps {
  onNavigateTab: (tab: string) => void;
  onSelectTenderForMatch: (tenderId: number) => void;
  onAskCopilot: (question: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateTab,
  onSelectTenderForMatch,
  onAskCopilot,
}) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickPrompt, setQuickPrompt] = useState(
    'Which Ugandan suppliers can meet UNOC-TEN-2026-041, what are they missing, what similar contracts have they won, and what should we do next?'
  );

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<OverviewPayload>('/api/overview');
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Unable to load workbench overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleQuickDecision = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/api/governance/proposals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to record decision.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-red-700">Overview Data Unavailable</h3>
          <p className="text-sm text-slate-600 mt-1">{error}</p>
        </div>
        <button
          onClick={loadOverview}
          className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          Retry Load
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* North-Star Decision Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-teal-700 tracking-wide">
              Uganda Petroleum Ecosystem · Active Intelligence Loop
            </p>
            <h1 className="text-xl font-semibold text-slate-900 mt-1 text-balance">
              Source-Grounded Supplier, Tender & Regulatory Decision Workbench
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('opportunities')}
              className="px-4 py-2 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              Open Matching Workbench
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickPrompt.trim()) {
              onAskCopilot(quickPrompt.trim());
            }
          }}
          className="mt-5 flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask KINT Research Copilot with verified source citations..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>Run Grounded Brief</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </section>

      {/* 4-Column Institutional KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Verified Suppliers (PAU NSD)</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-2">
            {data.kpis.verifiedSuppliersCount} / {data.kpis.totalSuppliersCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Canonical Ugandan registry · Tier A–C
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Active Petroleum Tenders</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-2">
            {data.kpis.openTendersCount}
          </p>
          <p className="text-xs text-slate-500 font-mono tabular-nums mt-1.5">
            ${(data.kpis.totalOpenTenderValueUsd / 1_000_000).toFixed(2)}M est. pipeline
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Pending Human Approvals</p>
          <p className="text-2xl font-semibold text-amber-700 font-mono tabular-nums mt-2">
            {data.kpis.openProposalsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {data.kpis.expiringCertsCount} cert expiry signals
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs text-slate-500">Compounding Eval Signals</p>
          <p className="text-2xl font-semibold text-teal-700 font-mono tabular-nums mt-2">
            {data.kpis.feedbackLabelsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {data.kpis.historicalAwardsCount} verified contract awards
          </p>
        </div>
      </section>

      {/* Main Split: Priority Tenders + Human Approval Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Priority Tenders Table */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Active Procurement Opportunities
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any tender to run M07/M09 supplier readiness ranking
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('opportunities')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-2.5 px-4 font-medium">Reference / Tender</th>
                  <th className="py-2.5 px-4 font-medium">Buyer</th>
                  <th className="py-2.5 px-4 font-medium text-right">Est. Value</th>
                  <th className="py-2.5 px-4 font-medium">Deadline</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {data.priorityTenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{tender.title}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {tender.referenceCode} · {tender.category} · Tier {tender.confidenceTier}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {tender.buyerOrganisation}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      ${(tender.estimatedValueUsd / 1_000_000).toFixed(2)}M
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                      {tender.deadline}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTenderForMatch(tender.id)}
                        className="px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-200 bg-teal-50/50 rounded hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        Rank Suppliers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Agent Proposals & M24 Signals */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Agent Queue & Data Anomalies
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Human-in-the-loop sign-off required before authoritative changes
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('governance')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
            >
              Audit Queue
            </button>
          </div>

          {data.openEvents.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-slate-900 mt-2">
                All agent proposals reviewed
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Run an M24 data quality scan from Governance to detect new drift.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {data.openEvents.map((ev) => (
                <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {ev.severity === 'warning' || ev.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-mono text-slate-500">
                          {ev.agentId || 'System'} · {ev.modelId || 'Rule'} · {ev.eventType}
                        </p>
                        <h3 className="text-sm font-medium text-slate-900 mt-0.5">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleQuickDecision(ev.id, 'rejected')}
                      className="px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleQuickDecision(ev.id, 'approved')}
                      className="px-3 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Approve Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Historical Awards + Recent Immutable Audit Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Verified Historical Contract Awards
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {data.recentAwards.map((aw) => (
              <div key={aw.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{aw.winningProviderName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {aw.title} · {aw.awardDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono tabular-nums font-medium text-slate-900">
                    ${(aw.contractValueUsd / 1_000_000).toFixed(2)}M
                  </p>
                  <p className="text-xs text-slate-500">{aw.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Platform Audit Trail
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {data.recentAudit.slice(0, 4).map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-slate-800">{log.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {log.actorEmail} · {log.resourceType} #{log.resourceId}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
