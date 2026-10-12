import React, { useState } from 'react';
import { Flag, Award, Cpu, RefreshCw, Link2, Check, X, Server } from 'lucide-react';

interface NavbarProps {
  activeTab: 'predict' | 'results' | 'model';
  setActiveTab: (tab: 'predict' | 'results' | 'model') => void;
  hasResults: boolean;
  backendConnected: boolean;
  onRefreshHealth: () => void;
  apiUrl: string;
  onUpdateApiUrl: (url: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasResults,
  backendConnected,
  onRefreshHealth,
  apiUrl,
  onUpdateApiUrl,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(apiUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateApiUrl(inputUrl.trim());
    setShowConfig(false);
  };

  const handleReset = () => {
    setInputUrl('');
    onUpdateApiUrl('');
    setShowConfig(false);
  };

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

          {/* Backend Status Badge with Interactive Config */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              title="Click to configure backend connection"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-[#14141A] border border-white/10 text-xs font-mono rounded-none hover:border-white/30 transition-colors cursor-pointer group"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-[#E10600] animate-pulse shadow-[0_0_8px_rgba(225,6,0,0.8)]'
                }`}
              />
              <span className="hidden sm:inline text-[#8A8A96] group-hover:text-white">
                {backendConnected ? 'API READY' : 'CONNECT BACKEND'}
              </span>
              <Server className="w-3 h-3 text-[#8A8A96] group-hover:text-white" />
            </button>

            {/* Connection Config Popover */}
            {showConfig && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#121217] border border-white/20 p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold uppercase tracking-wider font-heading text-white">
                      Backend Connection
                    </span>
                  </div>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="text-[#8A8A96] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8A8A96] mb-1">
                    <span>STATUS:</span>
                    <span className={backendConnected ? 'text-emerald-400 font-bold' : 'text-[#E10600] font-bold'}>
                      {backendConnected ? 'CONNECTED' : 'DISCONNECTED / OFFLINE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8A8A96]">
                    <span className="truncate max-w-[200px]">TARGET: {apiUrl ? apiUrl : '(Same-origin relative /api)'}</span>
                    <button
                      type="button"
                      onClick={onRefreshHealth}
                      className="p-1 hover:text-white flex items-center gap-1 text-[10px]"
                      title="Test Connection"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ping</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-[#8A8A96] mb-1">
                      Custom Backend URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://f1-prediction-backend.vercel.app"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full bg-[#1A1A22] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-white/30 font-mono focus:border-[#E10600] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#8A8A96] mt-1">
                      Paste your deployed backend URL or leave empty for same domain.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#8A8A96] hover:text-white"
                    >
                      Reset Default
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#E10600] hover:bg-[#FF2E2E] text-[11px] font-bold uppercase font-heading text-white flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Connect</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
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
