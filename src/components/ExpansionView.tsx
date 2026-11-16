import React, { useEffect, useState } from 'react';
import { ExternalLink, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SeriesPoint {
  id: number;
  periodDate: string;
  seriesType: string;
  value: number;
  lowerBound: number | null;
  upperBound: number | null;
  sourceName: string;
  confidenceTier: string;
}

interface CommodityWithSeries {
  id: number;
  code: string;
  name: string;
  sector: string;
  unit: string;
  benchmark: string;
  hsCode: string;
  importSubstitutionGapScore: number;
  series: SeriesPoint[];
}

interface DocumentRecord {
  id: number;
  code: string;
  title: string;
  docType: string;
  sector: string;
  sourceName: string;
  sourceUrl: string | null;
  publishedDate: string;
  summary: string;
}

interface MineralLicenceRecord {
  id: number;
  licenceCode: string;
  holderName: string;
  commodity: string;
  licenceType: string;
  district: string;
  areaKm2: number;
  status: string;
  expiryDate: string;
  infraProximityScore: number;
  prospectivityTier: string;
  provenanceSource: string;
}

export const ExpansionView: React.FC = () => {
  const { apiFetch } = useAuth();
  const [commodities, setCommodities] = useState<CommodityWithSeries[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [mineralLicences, setMineralLicences] = useState<MineralLicenceRecord[]>([]);
  const [selectedCommodityIdx, setSelectedCommodityIdx] = useState(0);
  const [subTab, setSubTab] = useState<'energy' | 'minerals' | 'docs'>('energy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarket = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiFetch<{
          commodities: CommodityWithSeries[];
          documents: DocumentRecord[];
          mineralLicences: MineralLicenceRecord[];
        }>('/api/market/intelligence');
        setCommodities(payload.commodities);
        setDocuments(payload.documents);
        setMineralLicences(payload.mineralLicences);
      } catch (err: any) {
        setError(err.message || 'Unable to load market expansion modules.');
      } finally {
        setLoading(false);
      }
    };
    loadMarket();
  }, []);

  const activeCommodity = commodities[selectedCommodityIdx];

  const renderForecastSvg = (series: SeriesPoint[]) => {
    if (!series || series.length === 0) return null;
    const width = 640;
    const height = 220;
    const padX = 48;
    const padY = 24;

    const allVals = series.flatMap((s) =>
      [s.value, s.lowerBound ?? s.value, s.upperBound ?? s.value].filter(
        (v): v is number => typeof v === 'number'
      )
    );
    const minV = Math.min(...allVals) * 0.95;
    const maxV = Math.max(...allVals) * 1.05;
    const rangeV = maxV - minV || 1;

    const xAt = (i: number) =>
      padX + (i / Math.max(1, series.length - 1)) * (width - padX * 2);
    const yAt = (v: number) =>
      height - padY - ((v - minV) / rangeV) * (height - padY * 2);

    const actualPts = series
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => s.seriesType === 'actual');
    const forecastPts = series
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => s.seriesType === 'forecast');

    const lastActual = actualPts[actualPts.length - 1];
    const forecastConnected = lastActual ? [lastActual, ...forecastPts] : forecastPts;

    const actualPath = actualPts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.idx)} ${yAt(p.value)}`)
      .join(' ');
    const forecastPath = forecastConnected
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.idx)} ${yAt(p.value)}`)
      .join(' ');

    const bandPts = forecastPts;
    const bandPath =
      bandPts.length > 0
        ? [
            ...bandPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.idx)} ${yAt(p.upperBound ?? p.value)}`),
            ...bandPts
              .slice()
              .reverse()
              .map((p) => `L ${xAt(p.idx)} ${yAt(p.lowerBound ?? p.value)}`),
            'Z',
          ].join(' ')
        : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
        {[0, 0.5, 1].map((t) => {
          const val = minV + t * rangeV;
          const y = yAt(val);
          return (
            <g key={t}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
                {val >= 100 ? Math.round(val) : val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {bandPath && <path d={bandPath} fill="rgba(13, 148, 136, 0.14)" />}
        {actualPath && <path d={actualPath} fill="none" stroke="#0f172a" strokeWidth={2.5} />}
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke="#0d9488"
            strokeWidth={2.5}
            strokeDasharray="5 4"
          />
        )}

        {series.map((s, i) => (
          <g key={s.id}>
            <circle
              cx={xAt(i)}
              cy={yAt(s.value)}
              r={3.5}
              fill={s.seriesType === 'actual' ? '#0f172a' : '#0d9488'}
            />
            {i % 2 === 0 && (
              <text
                x={xAt(i)}
                y={height - 4}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {s.periodDate}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Modular Sector Expansion: Energy, Trade & Minerals Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Canonical Year 2–3 architecture ready: M13–M15 commodity & import-substitution forecasts + M19–M21 minerals cadastre with uncertainty labels
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
          <button
            onClick={() => setSubTab('energy')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'energy'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Energy & Trade (M13–M15)
          </button>
          <button
            onClick={() => setSubTab('minerals')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'minerals'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Minerals Cadastre (M19–M21)
          </button>
          <button
            onClick={() => setSubTab('docs')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'docs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Regulatory Vault
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {subTab === 'energy' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {commodities.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedCommodityIdx(idx)}
                className={`w-full text-left p-4 transition-colors ${
                  idx === selectedCommodityIdx ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-mono text-slate-500">
                  {c.code} · HS {c.hsCode} · {c.sector}
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{c.name}</p>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-slate-600">M15 Import-Substitution Gap</span>
                  <span className="font-mono tabular-nums font-semibold text-teal-700">
                    {c.importSubstitutionGapScore}/100
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
            {activeCommodity && activeCommodity.series.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-mono text-slate-500">
                      {activeCommodity.benchmark} · Unit: {activeCommodity.unit}
                    </p>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">
                      {activeCommodity.name} — Actuals & Forecast Interval
                    </h2>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Solid: Actual · Dashed + Shaded: M13/M14 Confidence Band
                  </div>
                </div>

                <div className="mt-5">{renderForecastSvg(activeCommodity.series)}</div>

                <p className="text-xs text-slate-500 mt-4 border-t border-slate-200 pt-3">
                  Model predictions display 90% uncertainty intervals and are never presented as deterministic guarantees (Blueprint Section 2.3).
                </p>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                <Layers className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                Time series telemetry pending ingestion for {activeCommodity?.name}.
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'minerals' && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Uganda Mining Cadastre & Site Proximity Preview (MEMD)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                M19 prospectivity support is strictly advisory for expert geological review — not a substitute for field assay
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-2.5 px-4 font-medium">Licence / Holder</th>
                  <th className="py-2.5 px-4 font-medium">Commodity</th>
                  <th className="py-2.5 px-4 font-medium">District</th>
                  <th className="py-2.5 px-4 font-medium text-right">Area (km²)</th>
                  <th className="py-2.5 px-4 font-medium text-right">M20 Site Score</th>
                  <th className="py-2.5 px-4 font-medium">M19 Prospectivity (Uncertain)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {mineralLicences.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{lic.holderName}</div>
                      <div className="font-mono text-slate-500 mt-0.5">
                        {lic.licenceCode} · {lic.licenceType} · {lic.status}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{lic.commodity}</td>
                    <td className="py-3 px-4 text-slate-700">{lic.district}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {lic.areaKm2.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-teal-700">
                      {lic.infraProximityScore}/100
                    </td>
                    <td className="py-3 px-4 text-slate-700">{lic.prospectivityTier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {subTab === 'docs' && (
        <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {documents.map((doc) => (
            <div key={doc.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                <span>
                  {doc.code} · {doc.docType} · {doc.sourceName}
                </span>
                <span>Published {doc.publishedDate}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">{doc.title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{doc.summary}</p>
              {doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline mt-2"
                >
                  <span>View Official Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
