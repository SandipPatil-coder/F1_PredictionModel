import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PredictView } from './components/PredictView';
import { ResultsView } from './components/ResultsView';
import { ModelView } from './components/ModelView';
import { DriverDrawer } from './components/DriverDrawer';
import { StartLightsGantry } from './components/StartLightsGantry';
import type {
  DriverMeta,
  GridDriverInput,
  PredictResponse,
  PredictionDriver,
  MetaResponse,
  ModelInfoResponse,
  HealthResponse,
  StoredPrediction,
} from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Default Base API URL from environment
const DEFAULT_API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'predict' | 'results' | 'model'>('predict');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Dynamic API Base with localStorage persistence
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('f1_custom_api_url') || DEFAULT_API_BASE;
    } catch {
      return DEFAULT_API_BASE;
    }
  });

  const handleUpdateApiUrl = (newUrl: string) => {
    const cleaned = newUrl.replace(/\/+$/, '');
    setApiBaseUrl(cleaned);
    try {
      localStorage.setItem('f1_custom_api_url', cleaned);
    } catch {
      // ignore
    }
  };

  // Metadata
  const [drivers, setDrivers] = useState<DriverMeta[]>([]);
  const [circuits, setCircuits] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [predictorGroups, setPredictorGroups] = useState<Record<string, string[]>>({});

  // Inputs
  const [selectedCircuit, setSelectedCircuit] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<number>(2026);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [gridInputs, setGridInputs] = useState<GridDriverInput[]>([]);

  // Results & Model State
  const [results, setResults] = useState<PredictResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [showStartGantry, setShowStartGantry] = useState<boolean>(false);
  const [selectedDriverForDrawer, setSelectedDriverForDrawer] = useState<PredictionDriver | null>(null);

  // LocalStorage History
  const [recentPredictions, setRecentPredictions] = useState<StoredPrediction[]>(() => {
    try {
      const saved = localStorage.getItem('f1_recent_predictions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Health Check
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/health`);
      if (res.ok) {
        const data: HealthResponse = await res.json();
        setBackendConnected(data.status === 'ok');
        setBackendError(data.error);
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    }
  }, [apiBaseUrl]);

  // Fetch Meta
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/meta`);
      if (res.ok) {
        const data: MetaResponse = await res.json();
        setCircuits(data.circuits || []);
        setDrivers(data.drivers || []);
        setSeasons(data.available_seasons || [2026, 2025]);
        setPredictorGroups(data.predictor_groups || {});

        if (data.circuits && data.circuits.length > 0) {
          setSelectedCircuit(data.circuits[0]);
        }
        if (data.available_seasons && data.available_seasons.length > 0) {
          setSelectedSeason(data.available_seasons[0]);
        }

        // Initialize 1-to-N default grid
        const initialGrid: GridDriverInput[] = (data.drivers || []).map((d, index) => ({
          driver_name: d.name,
          qualifying_position: index + 1,
        }));
        setGridInputs(initialGrid);
      }
    } catch (e: any) {
      console.error('Failed to fetch metadata:', e);
    }
  }, [apiBaseUrl]);

  // Fetch Model Info
  const fetchModelInfo = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/model-info`);
      if (res.ok) {
        const data: ModelInfoResponse = await res.json();
        setModelInfo(data);
      }
    } catch (e: any) {
      console.error('Failed to fetch model info:', e);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    checkHealth();
    fetchMeta();
    fetchModelInfo();
  }, [checkHealth, fetchMeta, fetchModelInfo]);

  // Execute Prediction API call
  const executePrediction = async () => {
    setIsPredicting(true);
    setBackendError(null);

    try {
      const payload = {
        circuit: selectedCircuit,
        season: selectedSeason,
        round: selectedRound,
        grid: gridInputs,
      };

      const res = await fetch(`${apiBaseUrl}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate prediction from model');
      }

      const data: PredictResponse = await res.json();
      setResults(data);
      setActiveTab('results');

      // Persist to recent
      const storedItem: StoredPrediction = {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        circuit: data.circuit,
        season: data.season,
        round: data.round,
        p1: data.predicted_podium[0]?.driver_name || 'Unknown',
        p2: data.predicted_podium[1]?.driver_name || 'Unknown',
        p3: data.predicted_podium[2]?.driver_name || 'Unknown',
        data,
      };

      setRecentPredictions((prev) => {
        const updated = [storedItem, ...prev.filter((p) => p.circuit !== data.circuit || p.season !== data.season)].slice(0, 5);
        localStorage.setItem('f1_recent_predictions', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      setBackendError(err.message || 'Prediction failed');
    } finally {
      setIsPredicting(false);
      setShowStartGantry(false);
    }
  };

  const handleStartSequence = () => {
    setShowStartGantry(true);
  };

  const handleSelectRecent = (pred: StoredPrediction) => {
    setResults(pred.data);
    setSelectedCircuit(pred.circuit);
    setSelectedSeason(pred.season);
    setSelectedRound(pred.round);
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-white flex flex-col">
      {/* 5-Light Start Gantry Countdown Sequence */}
      {showStartGantry && (
        <StartLightsGantry onComplete={executePrediction} />
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasResults={results !== null}
        backendConnected={backendConnected}
        apiUrl={apiBaseUrl}
        onUpdateApiUrl={handleUpdateApiUrl}
        onRefreshHealth={() => {
          checkHealth();
          fetchMeta();
          fetchModelInfo();
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Backend Degraded / Error Notification Banner */}
        {backendError && (
          <div className="mb-8 p-4 bg-[#251010] border border-[#E10600] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#E10600] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold uppercase font-heading text-white">
                Backend System Notice
              </h4>
              <p className="text-xs text-red-200 mt-0.5">
                {backendError}
              </p>
            </div>
            <button
              onClick={() => {
                checkHealth();
                fetchMeta();
              }}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs font-mono text-white flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* View Switching */}
        {activeTab === 'predict' && (
          <PredictView
            drivers={drivers}
            circuits={circuits}
            seasons={seasons}
            selectedCircuit={selectedCircuit}
            setSelectedCircuit={setSelectedCircuit}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedRound={selectedRound}
            setSelectedRound={setSelectedRound}
            gridInputs={gridInputs}
            setGridInputs={setGridInputs}
            onStartPrediction={handleStartSequence}
            isLoading={isPredicting}
            recentPredictions={recentPredictions}
            onSelectRecent={handleSelectRecent}
          />
        )}

        {activeTab === 'results' && results && (
          <ResultsView
            results={results}
            onEditGrid={() => setActiveTab('predict')}
            onNewPrediction={() => {
              setResults(null);
              setActiveTab('predict');
            }}
            onSelectDriver={(driver) => setSelectedDriverForDrawer(driver)}
          />
        )}

        {activeTab === 'model' && (
          <ModelView
            modelInfo={modelInfo}
            isLoading={!modelInfo && backendConnected}
            error={backendError}
          />
        )}
      </main>

      {/* Driver Feature Calculation Drawer */}
      <DriverDrawer
        driver={selectedDriverForDrawer}
        onClose={() => setSelectedDriverForDrawer(null)}
        predictorGroups={predictorGroups}
      />
    </div>
  );
};
export default App;
