import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AuditLogRecord,
  EventProposalRecord,
  FeedbackLabelRecord,
} from '../types/kint.ts';

interface GovernancePayload {
  events: EventProposalRecord[];
  auditLog: AuditLogRecord[];
  feedbackLabels: FeedbackLabelRecord[];
}

export const GovernanceView: React.FC = () => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<GovernancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadGovernance = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<GovernancePayload>('/api/governance/proposals');
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to load governance queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGovernance();
  }, []);

  const handleDecision = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/api/governance/proposals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setNotice(`Proposal #${id} marked as ${decision} and recorded to audit log.`);
      await loadGovernance();
    } catch (err: any) {
      setError(err.message || 'Failed to apply decision.');
    }
  };

  const handleRunStewardScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await apiFetch<{ newAnomaliesCreated: number }>(
        '/api/governance/run-steward',
        { method: 'POST' }
      );
      setNotice(
        `M24 Data Quality scan completed: ${res.newAnomaliesCreated} new anomaly signal(s) queued.`
      );
      await loadGovernance();
    } catch (err: any) {
      setError(err.message || 'Steward scan failed.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Human-in-the-Loop Governance & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Agents draft and recommend; analysts approve authoritative record changes, monitor M24 anomalies, and review immutable logs
          </p>
        </div>
        <button
          onClick={handleRunStewardScan}
          disabled={scanning}
          className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning Registry...' : 'Run M24 Data Quality Scan'}</span>
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-900">
          {notice}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Proposals & M24 Anomalies */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">
                Agent Proposals & Anomaly Queue ({data.events.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {data.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      #{ev.id} · {ev.agentId || 'System'} · {ev.modelId || 'Rule'} · {ev.eventType} · Status:{' '}
                      <span
                        className={
                          ev.status === 'open'
                            ? 'text-amber-700 font-semibold'
                            : ev.status === 'approved'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {ev.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mt-1">{ev.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{ev.description}</p>
                    {ev.resolvedBy && (
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        Decided by {ev.resolvedBy}
                      </p>
                    )}
                  </div>

                  {ev.status === 'open' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDecision(ev.id, 'rejected')}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleDecision(ev.id, 'approved')}
                        className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded hover:bg-teal-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve & Apply</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Feedback Labels + Audit Log Split */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">
                  Compounding Feedback Labels ({data.feedbackLabels.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                {data.feedbackLabels.map((fb) => (
                  <div key={fb.id} className="p-3.5 text-xs">
                    <div className="flex items-center justify-between font-mono text-slate-500">
                      <span>{fb.targetType}</span>
                      <span className="text-teal-700 font-semibold">{fb.labelValue}</span>
                    </div>
                    <p className="font-medium text-slate-900 mt-1">{fb.targetId}</p>
                    {fb.notes && <p className="text-slate-600 mt-0.5">{fb.notes}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">
                  Immutable Tool & Decision Audit Log
                </h2>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="py-2 px-4 font-medium">Action</th>
                      <th className="py-2 px-4 font-medium">Actor / Model</th>
                      <th className="py-2 px-4 font-medium">Resource</th>
                      <th className="py-2 px-4 font-medium text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {data.auditLog.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-slate-900">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {log.actorEmail}
                          {log.modelId ? ` · ${log.modelId}` : ''}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {log.resourceType}:{log.resourceId}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
