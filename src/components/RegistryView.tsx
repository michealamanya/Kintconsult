import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { OrganisationRecord } from '../types/kint.ts';

export const RegistryView: React.FC = () => {
  const { apiFetch } = useAuth();
  const [organisations, setOrganisations] = useState<OrganisationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [selectedOrg, setSelectedOrg] = useState<OrganisationRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Create form state
  const [newLegalName, setNewLegalName] = useState('');
  const [newSector, setNewSector] = useState('Petroleum');
  const [newSubsector, setNewSubsector] = useState('');
  const [newDistrict, setNewDistrict] = useState('Hoima');
  const [newOwnership, setNewOwnership] = useState('Ugandan Owned');
  const [newLocalPct, setNewLocalPct] = useState('100');
  const [newNsdNum, setNewNsdNum] = useState('');
  const [newSource, setNewSource] = useState('PAU National Supplier Database (NSD)');
  const [newSourceUrl, setNewSourceUrl] = useState('https://nsd.pau.go.ug/');
  const [submitting, setSubmitting] = useState(false);

  const loadRegistry = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (sectorFilter !== 'All') params.set('sector', sectorFilter);
      if (tierFilter !== 'All') params.set('tier', tierFilter);

      const payload = await apiFetch<{ organisations: OrganisationRecord[] }>(
        `/api/organisations?${params.toString()}`
      );
      setOrganisations(payload.organisations);
      if (selectedOrg) {
        const refreshed = payload.organisations.find((o) => o.id === selectedOrg.id);
        if (refreshed) setSelectedOrg(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load industrial registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, [sectorFilter, tierFilter]);

  const handleVerify = async (
    orgId: number,
    verificationStatus: 'Verified' | 'Needs Review' | 'Flagged',
    confidenceTier: string
  ) => {
    try {
      await apiFetch(`/api/organisations/${orgId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verificationStatus, confidenceTier }),
      });
      setStatusMessage(`Updated verification status to ${verificationStatus} (Tier ${confidenceTier}).`);
      await loadRegistry();
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/organisations', {
        method: 'POST',
        body: JSON.stringify({
          legalName: newLegalName,
          sector: newSector,
          subsector: newSubsector,
          district: newDistrict,
          ownershipType: newOwnership,
          localContentPct: Number(newLocalPct),
          pauNsdNumber: newNsdNum,
          pauNsdStatus: newNsdNum ? 'Active' : 'Pending',
          provenanceSource: newSource,
          provenanceUrl: newSourceUrl,
          confidenceTier: 'B',
        }),
      });
      setShowCreateModal(false);
      setNewLegalName('');
      setNewSubsector('');
      setNewNsdNum('');
      setStatusMessage('New canonical organisation added and logged to audit trail.');
      await loadRegistry();
    } catch (err: any) {
      setError(err.message || 'Failed to create organisation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Canonical Industrial Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified profiles, PAU NSD registration, provenance confidence tiers (A–D) and audit history
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Organisation</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadRegistry();
            }}
            className="flex gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, district, NSD#, capability..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Filter
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {['All', 'Petroleum', 'Energy', 'Minerals'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSectorFilter(sec)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    sectorFilter === sec
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {['All', 'A', 'B', 'C'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    tierFilter === t
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'All' ? 'All Tiers' : `Tier ${t}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Registry Table + Inspector Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section
          className={`${
            selectedOrg ? 'xl:col-span-7' : 'xl:col-span-12'
          } bg-white border border-slate-200 rounded-lg overflow-hidden`}
        >
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : organisations.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">No organisations match these filters</p>
              <p className="text-xs text-slate-500 mt-1">
                Clear the search criteria or register a new verified supplier profile.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th className="py-2.5 px-4 font-medium">Legal Entity & Subsector</th>
                    <th className="py-2.5 px-4 font-medium">District</th>
                    <th className="py-2.5 px-4 font-medium">PAU NSD</th>
                    <th className="py-2.5 px-4 font-medium text-right">Ugandan Equity</th>
                    <th className="py-2.5 px-4 font-medium">Confidence</th>
                    <th className="py-2.5 px-4 font-medium">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {organisations.map((org) => {
                    const isSelected = selectedOrg?.id === org.id;
                    return (
                      <tr
                        key={org.id}
                        onClick={() => setSelectedOrg(org)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{org.legalName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {org.sector} · {org.subsector}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">{org.district}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">
                          {org.pauNsdNumber || 'Pending'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                          {org.localContentPct}%
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-700">
                          Tier {org.confidenceTier}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={`font-medium ${
                              org.verificationStatus === 'Verified'
                                ? 'text-emerald-700'
                                : org.verificationStatus === 'Flagged'
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {org.verificationStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Organisation Provenance & Dossier Inspector */}
        {selectedOrg && (
          <aside className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  ORG-{selectedOrg.id} · {selectedOrg.ownershipType} · Tier {selectedOrg.confidenceTier}
                </p>
                <h2 className="text-base font-semibold text-slate-900 mt-1">
                  {selectedOrg.legalName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedOrg.subsector} · {selectedOrg.district}, {selectedOrg.country}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
                aria-label="Close dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provenance Lineage */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-900">
                Provenance & Authoritative Source
              </h3>
              <p className="text-xs text-slate-600">
                Source: {selectedOrg.provenanceSource}
              </p>
              {selectedOrg.provenanceUrl && (
                <a
                  href={selectedOrg.provenanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                >
                  <span>Inspect official registry source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <p className="text-xs text-slate-500 font-mono">
                PAU NSD: {selectedOrg.pauNsdNumber || 'None'} ({selectedOrg.pauNsdStatus})
              </p>
            </div>

            {/* Capabilities */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900">
                Evidence-Backed Capabilities ({selectedOrg.capabilities.length})
              </h3>
              {selectedOrg.capabilities.length === 0 ? (
                <p className="text-xs text-slate-500">No verified capabilities linked yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                  {selectedOrg.capabilities.map((cap) => (
                    <div key={cap.id} className="p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900">{cap.name}</span>
                        <span className="font-mono text-slate-500">{cap.code}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{cap.evidenceSummary}</p>
                      {cap.capacityMetric && (
                        <p className="text-xs font-mono text-teal-700 mt-1">
                          Capacity: {cap.capacityMetric}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900">
                Certifications & Licences ({selectedOrg.certifications.length})
              </h3>
              {selectedOrg.certifications.length === 0 ? (
                <p className="text-xs text-slate-500">No active certifications on record.</p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                  {selectedOrg.certifications.map((cert) => (
                    <div key={cert.id} className="p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-900">
                          {cert.certType} · {cert.issuer}
                        </p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          {cert.referenceNumber} · Valid until {cert.validTo}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          cert.status === 'Valid'
                            ? 'text-emerald-700'
                            : cert.status === 'Expired'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {cert.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analyst Verification Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Analyst Stewardship Action</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVerify(selectedOrg.id, 'Flagged', 'C')}
                  className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded hover:bg-red-50 whitespace-nowrap shrink-0"
                >
                  Flag Conflict
                </button>
                <button
                  onClick={() => handleVerify(selectedOrg.id, 'Verified', 'A')}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify Tier A</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Register New Organisation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Register Canonical Organisation
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Legal Entity Name
                </label>
                <input
                  required
                  value={newLegalName}
                  onChange={(e) => setNewLegalName(e.target.value)}
                  placeholder="e.g., Lake Albert Engineering Services Ltd"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sector</label>
                  <select
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Petroleum">Petroleum</option>
                    <option value="Energy">Energy</option>
                    <option value="Petrochemicals">Petrochemicals</option>
                    <option value="Minerals">Minerals</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
                  <input
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Subsector / Primary Scope
                </label>
                <input
                  required
                  value={newSubsector}
                  onChange={(e) => setNewSubsector(e.target.value)}
                  placeholder="e.g., Valve Inspection & Pipeline Integrity"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ownership Type
                  </label>
                  <select
                    value={newOwnership}
                    onChange={(e) => setNewOwnership(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Ugandan Owned">Ugandan Owned</option>
                    <option value="Joint Venture">Joint Venture</option>
                    <option value="International">International</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ugandan Equity (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newLocalPct}
                    onChange={(e) => setNewLocalPct(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PAU NSD Number (Optional)
                  </label>
                  <input
                    value={newNsdNum}
                    onChange={(e) => setNewNsdNum(e.target.value)}
                    placeholder="PAU-NSD-2026-..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Provenance Source
                  </label>
                  <input
                    required
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Source URL (Provenance)
                </label>
                <input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving...' : 'Save to Registry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
