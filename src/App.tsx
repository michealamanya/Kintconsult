import React, { useState } from 'react';
import {
  Activity,
  Bot,
  Briefcase,
  Building2,
  Compass,
  LogOut,
  Menu,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { RegistryView } from './components/RegistryView.tsx';
import { OpportunitiesView } from './components/OpportunitiesView.tsx';
import { CopilotView } from './components/CopilotView.tsx';
import { GovernanceView } from './components/GovernanceView.tsx';
import { ExpansionView } from './components/ExpansionView.tsx';

type NavTab =
  | 'overview'
  | 'registry'
  | 'opportunities'
  | 'copilot'
  | 'governance'
  | 'expansion';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Workbench Overview', icon: Activity },
  { id: 'registry', label: 'Industrial Registry', icon: Building2 },
  { id: 'opportunities', label: 'Opportunities & Match', icon: Briefcase },
  { id: 'copilot', label: 'AI Research Copilot', icon: Bot },
  { id: 'governance', label: 'Governance & Audit', icon: Scale },
  { id: 'expansion', label: 'Energy & Minerals', icon: Compass },
];

const KintShell: React.FC = () => {
  const { firebaseUser, kintUser, loading, authError, signInWithGoogle, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTenderForMatch, setSelectedTenderForMatch] = useState<number | null>(null);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState<string | null>(null);
  const [triggerExtractModal, setTriggerExtractModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">Initializing KINT Workbench...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#0F172A" />
              <path d="M9 8V24M9 16L18 8M13.5 12L21 24" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="22.5" cy="10.5" r="2" fill="#F8FAFC" />
            </svg>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight font-display">
                KINT
              </span>
              <p className="text-xs text-slate-500">Industrial Intelligence Platform</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-slate-900 text-balance">
              Analyst & Buyer Intelligence Workbench
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Verified supplier registries, deterministic tender compliance scoring, predictive market signals, and source-grounded AI research for Uganda’s petroleum, energy, and minerals sectors.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              {authError}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <span>Sign in with Google</span>
          </button>

          <p className="text-xs text-slate-500 text-center">
            Protected by role-based tenant isolation and immutable tool audit logging.
          </p>
        </div>
      </div>
    );
  }

  const activeNavLabel = NAV_ITEMS.find((i) => i.id === activeTab)?.label || 'Overview';

  const handleOpenTenderMatch = (tenderId: number) => {
    setSelectedTenderForMatch(tenderId);
    setActiveTab('opportunities');
  };

  const handleAskCopilot = (q: string) => {
    setCopilotInitialQuery(q);
    setActiveTab('copilot');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="h-14 px-5 border-b border-slate-200 flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#0F172A" />
            <path d="M9 8V24M9 16L18 8M13.5 12L21 24" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22.5" cy="10.5" r="2" fill="#F8FAFC" />
          </svg>
          <span className="text-base font-bold text-slate-900 tracking-tight font-display whitespace-nowrap shrink-0">
            KINT Intelligence
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="text-xs">
            <p className="font-medium text-slate-900 truncate">
              {kintUser?.displayName || firebaseUser.displayName || 'KINT Analyst'}
            </p>
            <p className="text-slate-500 truncate">
              {kintUser?.email || firebaseUser.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 bg-white border-r border-slate-200 flex flex-col h-full">
            <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-base font-bold text-slate-900 font-display">KINT Intelligence</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left + 1 Primary CTA on right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="whitespace-nowrap">KINT Petroleum MVP</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 whitespace-nowrap truncate">
                {activeNavLabel}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('opportunities');
              setTriggerExtractModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Extract Tender</span>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigateTab={(t) => setActiveTab(t as NavTab)}
              onSelectTenderForMatch={handleOpenTenderMatch}
              onAskCopilot={handleAskCopilot}
            />
          )}
          {activeTab === 'registry' && <RegistryView />}
          {activeTab === 'opportunities' && (
            <OpportunitiesView
              initialTenderId={selectedTenderForMatch}
              openExtractModalExternal={triggerExtractModal}
              onCloseExtractModalExternal={() => setTriggerExtractModal(false)}
            />
          )}
          {activeTab === 'copilot' && (
            <CopilotView initialQuestion={copilotInitialQuery} />
          )}
          {activeTab === 'governance' && <GovernanceView />}
          {activeTab === 'expansion' && <ExpansionView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <KintShell />
    </AuthProvider>
  );
}
