import React, { useState } from 'react';
import { Flag, Trash2, Clock, ChevronDown, ChevronUp, AlertCircle, Sparkles, History } from 'lucide-react';
import type { DriverMeta, GridDriverInput, StoredPrediction } from '../types';

interface PredictViewProps {
  drivers: DriverMeta[];
  circuits: string[];
  seasons: number[];
  selectedCircuit: string;
  setSelectedCircuit: (circuit: string) => void;
  selectedSeason: number;
  setSelectedSeason: (season: number) => void;
  selectedRound: number;
  setSelectedRound: (round: number) => void;
  gridInputs: GridDriverInput[];
  setGridInputs: React.Dispatch<React.SetStateAction<GridDriverInput[]>>;
  onStartPrediction: () => void;
  isLoading: boolean;
  recentPredictions: StoredPrediction[];
  onSelectRecent: (pred: StoredPrediction) => void;
}

export const PredictView: React.FC<PredictViewProps> = ({
  drivers,
  circuits,
  seasons,
  selectedCircuit,
  setSelectedCircuit,
  selectedSeason,
  setSelectedRound,
  selectedRound,
  setSelectedSeason,
  gridInputs,
  setGridInputs,
  onStartPrediction,
  isLoading,
  recentPredictions,
  onSelectRecent,
}) => {
  const [showAdvancedQ1, setShowAdvancedQ1] = useState<boolean>(false);
  const [circuitSearch, setCircuitSearch] = useState<string>('');

  // Filter circuits by search term
  const filteredCircuits = circuits.filter((c) =>
    c.toLowerCase().includes(circuitSearch.toLowerCase())
  );

  // Position conflict detection
  const positionsUsed = gridInputs
    .map((g) => g.qualifying_position)
    .filter((pos) => pos > 0);
  const positionCounts: Record<number, number> = {};
  positionsUsed.forEach((pos) => {
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });

  const duplicatePositions = Object.keys(positionCounts)
    .filter((k) => positionCounts[Number(k)] > 1)
    .map(Number);

  const isValidGrid =
    gridInputs.length === drivers.length &&
    gridInputs.every((g) => g.qualifying_position >= 1 && g.qualifying_position <= drivers.length) &&
    duplicatePositions.length === 0;

  // Handle position update
  const handlePositionChange = (driverName: string, newPos: number) => {
    setGridInputs((prev) =>
      prev.map((item) =>
        item.driver_name === driverName
          ? { ...item, qualifying_position: Math.max(1, Math.min(drivers.length, newPos)) }
          : item
      )
    );
  };

  // Handle Q1 time update
  const handleQ1Change = (driverName: string, q1: string) => {
    setGridInputs((prev) =>
      prev.map((item) =>
        item.driver_name === driverName ? { ...item, q1_time: q1 } : item
      )
    );
  };

  // Quick Action: Auto-Fill 1 to 21
  const handleAutoFill = () => {
    setGridInputs((prev) =>
      prev.map((item, idx) => ({
        ...item,
        qualifying_position: idx + 1,
      }))
    );
  };

  // Quick Action: Clear Grid
  const handleClear = () => {
    setGridInputs((prev) =>
      prev.map((item) => ({
        ...item,
        qualifying_position: 0,
      }))
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden p-6 sm:p-10 f1-panel clip-angled-tl-br">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[#E10600] uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-[#E10600]" />
            Formula 1 Telemetry & ML Predictor
          </div>

          <h1 className="text-3xl sm:text-6xl font-black italic tracking-tight uppercase text-white font-heading">
            RACE PODIUM <span className="text-[#E10600]">PREDICTION</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#8A8A96] max-w-2xl">
            Configure the starting grid to execute our trained XGBoost classifier. Every probability is derived live from historical rolling form, circuit history, team trends, and qualifying pace without extrapolation.
          </p>
        </div>
      </div>

      {/* 3-Step Predictive Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Step 1 Setup & Actions */}
        <div className="space-y-6">
          {/* STEP 1: Race Setup */}
          <div className="p-6 f1-panel clip-angled-corner space-y-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="w-6 h-6 flex items-center justify-center bg-[#E10600] text-white text-xs font-black font-heading -skew-x-12">
                01
              </span>
              <h2 className="text-xl font-bold uppercase tracking-wider font-heading text-white">
                Race Setup
              </h2>
            </div>

            {/* Circuit Selector */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
                Circuit Venue
              </label>

              <input
                type="text"
                placeholder="Search circuit..."
                value={circuitSearch}
                onChange={(e) => setCircuitSearch(e.target.value)}
                className="w-full bg-[#0A0A0D] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600] transition-colors"
              />

              <select
                value={selectedCircuit}
                onChange={(e) => setSelectedCircuit(e.target.value)}
                className="w-full bg-[#0A0A0D] border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E10600] transition-colors cursor-pointer"
              >
                {filteredCircuits.map((circ) => (
                  <option key={circ} value={circ}>
                    {circ}
                  </option>
                ))}
              </select>
            </div>

            {/* Season & Round */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
                  Season
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="w-full bg-[#0A0A0D] border border-white/15 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E10600] cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
                  Round #
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0A0A0D] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>
          </div>

          {/* Predict Action Button (STEP 3) */}
          <div className="p-6 f1-panel clip-angled-corner space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="w-6 h-6 flex items-center justify-center bg-[#E10600] text-white text-xs font-black font-heading -skew-x-12">
                03
              </span>
              <h2 className="text-xl font-bold uppercase tracking-wider font-heading text-white">
                Launch Inference
              </h2>
            </div>

            {/* Grid Validation Message */}
            {!isValidGrid && (
              <div className="p-3 bg-[#251010] border border-[#E10600]/40 flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wide">Incomplete Grid</p>
                  {duplicatePositions.length > 0 ? (
                    <p className="text-[11px] text-red-300">
                      Duplicate qualifying positions detected: P{duplicatePositions.join(', P')}. Every driver must hold a unique position from P1 to P{drivers.length}.
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-300">
                      Assign a valid qualifying position (1 to {drivers.length}) to each of the {drivers.length} drivers.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={onStartPrediction}
              disabled={!isValidGrid || isLoading}
              className={`w-full min-h-[52px] py-3.5 px-6 font-heading font-black italic uppercase text-lg tracking-wider transition-all flex items-center justify-center gap-3 clip-slanted-edge ${
                isValidGrid && !isLoading
                  ? 'bg-[#E10600] hover:bg-[#FF1A1A] text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] cursor-pointer active:translate-y-0.5'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Flag className="w-5 h-5" />
              <span>{isLoading ? 'ANALYZING TELEMETRY...' : 'PREDICT PODIUM'}</span>
            </button>

            <p className="text-[11px] text-[#8A8A96] text-center font-mono">
              Inference triggers 5-light start sequence prior to probability tabulation.
            </p>
          </div>

          {/* Recent Predictions (LocalStorage) */}
          {recentPredictions.length > 0 && (
            <div className="p-5 f1-panel space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A8A96] font-heading">
                <History className="w-4 h-4 text-[#E10600]" />
                <span>Recent Predictions</span>
              </div>

              <div className="space-y-2">
                {recentPredictions.slice(0, 5).map((pred) => (
                  <button
                    key={pred.id}
                    onClick={() => onSelectRecent(pred)}
                    className="w-full text-left p-2.5 bg-[#0A0A0D] border border-white/5 hover:border-[#E10600]/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white font-heading truncate max-w-[180px]">
                        {pred.circuit}
                      </p>
                      <p className="text-[10px] text-[#8A8A96] font-mono">
                        {pred.season} R{pred.round} • P1: {pred.p1}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#E10600]">
                      View &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns (2-Span): STEP 2 Qualifying Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 f1-panel clip-angled-tl-br space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-[#E10600] text-white text-xs font-black font-heading -skew-x-12">
                  02
                </span>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider font-heading text-white">
                    Qualifying Grid
                  </h2>
                  <p className="text-xs text-[#8A8A96]">
                    Set starting positions (1 to {drivers.length}) for all active drivers.
                  </p>
                </div>
              </div>

              {/* Grid Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="px-3 py-1.5 min-h-[40px] bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider font-heading border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>Auto-Fill 1-{drivers.length}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 min-h-[40px] bg-white/5 hover:bg-white/10 text-[#8A8A96] hover:text-white text-xs font-bold uppercase tracking-wider font-heading border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Advanced Q1 Times Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedQ1(!showAdvancedQ1)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A8A96] hover:text-white transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-[#E10600]" />
                <span>Advanced: Optional Q1 Qualifying Lap Times</span>
                {showAdvancedQ1 ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Driver Grid List */}
            <div className="space-y-2">
              {gridInputs.map((item) => {
                const driverMeta = drivers.find((d) => d.name === item.driver_name) || {
                  name: item.driver_name,
                  code: item.driver_name.substring(0, 3).toUpperCase(),
                  constructor: 'Formula 1',
                  color: '#8A8A96',
                };

                const isConflict = duplicatePositions.includes(item.qualifying_position);

                return (
                  <div
                    key={item.driver_name}
                    className={`p-3 bg-[#14141A] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isConflict
                        ? 'border-[#E10600] bg-[#251010]'
                        : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Driver Identity */}
                    <div className="flex items-center gap-3">
                      {/* Constructor Color Bar */}
                      <span
                        className="w-2.5 h-9 shrink-0 clip-slanted-edge"
                        style={{ backgroundColor: driverMeta.color }}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black italic font-heading tracking-wider text-white">
                            {driverMeta.name}
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-white/10 text-white/80 font-bold">
                            {driverMeta.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8A8A96] uppercase tracking-wider font-heading">
                          {driverMeta.constructor}
                        </p>
                      </div>
                    </div>

                    {/* Inputs: Position & Optional Q1 Time */}
                    <div className="flex items-center gap-3">
                      {/* Optional Q1 Input */}
                      {showAdvancedQ1 && (
                        <div className="w-28">
                          <input
                            type="text"
                            placeholder="M:SS.mmm"
                            value={item.q1_time || ''}
                            onChange={(e) => handleQ1Change(item.driver_name, e.target.value)}
                            className="w-full bg-[#0A0A0D] border border-white/10 px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-[#E10600]"
                          />
                        </div>
                      )}

                      {/* Position Selector (1 to N) */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-[#8A8A96] sm:hidden">
                          Grid P
                        </label>
                        <select
                          value={item.qualifying_position || ''}
                          onChange={(e) =>
                            handlePositionChange(item.driver_name, Number(e.target.value))
                          }
                          className={`w-20 min-h-[44px] bg-[#0A0A0D] border font-heading font-black text-base text-center px-2 py-1 cursor-pointer transition-colors ${
                            isConflict
                              ? 'border-[#E10600] text-[#E10600]'
                              : item.qualifying_position > 0
                              ? 'border-white/20 text-white'
                              : 'border-white/10 text-[#8A8A96]'
                          }`}
                        >
                          <option value="0">P --</option>
                          {Array.from({ length: drivers.length }, (_, i) => i + 1).map((pos) => (
                            <option key={pos} value={pos}>
                              P{pos}
                            </option>
                          ))}
                        </select>

                        {/* Mobile Micro Increment/Decrement */}
                        <div className="flex flex-col sm:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              handlePositionChange(
                                item.driver_name,
                                (item.qualifying_position || 1) - 1
                              )
                            }
                            className="w-8 h-5 bg-white/10 flex items-center justify-center text-xs text-white cursor-pointer"
                          >
                            &uarr;
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handlePositionChange(
                                item.driver_name,
                                (item.qualifying_position || 1) + 1
                              )
                            }
                            className="w-8 h-5 bg-white/10 flex items-center justify-center text-xs text-white cursor-pointer"
                          >
                            &darr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
