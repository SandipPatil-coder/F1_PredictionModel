import React from 'react';
import { Flag, Award, Cpu, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: 'predict' | 'results' | 'model';
  setActiveTab: (tab: 'predict' | 'results' | 'model') => void;
  hasResults: boolean;
  backendConnected: boolean;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasResults,
  backendConnected,
  onRefreshHealth,
}) => {
  return (
    <>
      {/* Top Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0D]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Custom Wordmark: PODIUM PREDICTOR with slanted red slash */}
          <div
            onClick={() => setActiveTab('predict')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative flex items-center">
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter text-white font-heading">
                PODIUM
              </span>
              {/* Slanted red slash */}
              <div className="w-2.5 h-7 sm:h-8 bg-[#E10600] -skew-x-[24deg] mx-1.5 shadow-[0_0_12px_rgba(225,6,0,0.6)] group-hover:bg-[#FF2E2E] transition-colors" />
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter text-white font-heading">
                PREDICTOR
              </span>
            </div>
            <span className="hidden md:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] bg-[#1A1A21] border border-white/5">
              XGBOOST ML
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('predict')}
              className={`h-11 px-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-heading transition-all cursor-pointer ${
                activeTab === 'predict'
                  ? 'bg-[#E10600] text-white shadow-lg clip-slanted-edge'
                  : 'text-[#8A8A96] hover:text-white hover:bg-white/5'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>Grid Setup</span>
            </button>

            <button
              onClick={() => hasResults && setActiveTab('results')}
              disabled={!hasResults}
              className={`h-11 px-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-heading transition-all ${
                !hasResults
                  ? 'text-white/20 cursor-not-allowed'
                  : activeTab === 'results'
                  ? 'bg-[#E10600] text-white shadow-lg clip-slanted-edge cursor-pointer'
                  : 'text-[#8A8A96] hover:text-white hover:bg-white/5 cursor-pointer'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Podium Results</span>
            </button>

            <button
              onClick={() => setActiveTab('model')}
              className={`h-11 px-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-heading transition-all cursor-pointer ${
                activeTab === 'model'
                  ? 'bg-[#E10600] text-white shadow-lg clip-slanted-edge'
                  : 'text-[#8A8A96] hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Model Intel</span>
            </button>
          </nav>

          {/* Backend Status Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshHealth}
              title="Click to check backend status"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-[#14141A] border border-white/10 text-xs font-mono rounded-none hover:border-white/20 transition-colors cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-[#E10600] animate-pulse shadow-[0_0_8px_rgba(225,6,0,0.8)]'
                }`}
              />
              <span className="hidden sm:inline text-[#8A8A96]">
                {backendConnected ? 'API READY' : 'OFFLINE / STANDBY'}
              </span>
              <RefreshCw className="w-3 h-3 text-[#8A8A96] hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (min 44px touch targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D12]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('predict')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 text-xs font-bold uppercase font-heading transition-colors cursor-pointer ${
            activeTab === 'predict' ? 'text-[#E10600]' : 'text-[#8A8A96]'
          }`}
        >
          <Flag className="w-5 h-5" />
          <span>Grid</span>
        </button>

        <button
          onClick={() => hasResults && setActiveTab('results')}
          disabled={!hasResults}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 text-xs font-bold uppercase font-heading transition-colors ${
            !hasResults
              ? 'text-white/20'
              : activeTab === 'results'
              ? 'text-[#E10600] cursor-pointer'
              : 'text-[#8A8A96] cursor-pointer'
          }`}
        >
          <Award className="w-5 h-5" />
          <span>Podium</span>
        </button>

        <button
          onClick={() => setActiveTab('model')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 text-xs font-bold uppercase font-heading transition-colors cursor-pointer ${
            activeTab === 'model' ? 'text-[#E10600]' : 'text-[#8A8A96]'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span>Model</span>
        </button>
      </nav>
    </>
  );
};
