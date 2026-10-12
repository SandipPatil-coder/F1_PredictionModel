import React from 'react';
import { motion } from 'framer-motion';
import { Award, Info, RotateCcw, Edit3, ChevronRight } from 'lucide-react';
import type { PredictResponse, PredictionDriver } from '../types';

interface ResultsViewProps {
  results: PredictResponse;
  onEditGrid: () => void;
  onNewPrediction: () => void;
  onSelectDriver: (driver: PredictionDriver) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  onEditGrid,
  onNewPrediction,
  onSelectDriver,
}) => {
  const { circuit, season, round, predicted_podium, leaderboard } = results;

  const p1 = predicted_podium[0];
  const p2 = predicted_podium[1];
  const p3 = predicted_podium[2];

  return (
    <div className="space-y-10 pb-24">
      {/* Race Header Banner */}
      <div className="p-6 sm:p-8 f1-panel clip-angled-tl-br flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[#E10600] uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-[#E10600]" />
            MODEL CLASSIFICATION RESULTS
          </div>
          <h1 className="text-3xl sm:text-5xl font-black italic uppercase text-white font-heading tracking-tight">
            {circuit}
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8A96] font-mono mt-1">
            SEASON {season} // ROUND {round}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onEditGrid}
            className="px-4 py-2.5 min-h-[44px] bg-[#14141A] hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider font-heading transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-[#E10600]" />
            <span>Edit Grid</span>
          </button>
          <button
            onClick={onNewPrediction}
            className="px-4 py-2.5 min-h-[44px] bg-[#E10600] hover:bg-[#FF1A1A] text-white text-xs font-bold uppercase tracking-wider font-heading transition-colors flex items-center gap-2 clip-slanted-edge cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Prediction</span>
          </button>
        </div>
      </div>

      {/* Mandatory Statistical Callout */}
      <div className="p-4 bg-[#14141A] border-l-4 border-[#E10600] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#E10600] shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[#8A8A96] leading-relaxed">
          <strong className="text-white">Statistical Model Note:</strong> Probabilities are independent per-driver podium chances from the model, so they do not sum to 100%. Each percentage indicates the driver&apos;s individual probability of finishing P1, P2, or P3 based on the 21 model predictors.
        </p>
      </div>

      {/* PODIUM GRAPHIC: P1 Center (Tallest), P2 Left, P3 Right */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8A8A96] font-heading">
          <Award className="w-4 h-4 text-[#E10600]" />
          <span>PROJECTED PODIUM FINISHERS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-4">
          {/* P2 - Second Step (Left) */}
          {p2 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => onSelectDriver(p2)}
              className="f1-panel p-5 cursor-pointer hover:border-white/30 transition-all group relative flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-slate-300 text-black font-black font-heading text-lg -skew-x-12 shadow">
                    P2
                  </span>
                  <span
                    className="w-3 h-6 clip-slanted-edge"
                    style={{ backgroundColor: p2.constructor_color }}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase font-heading text-white group-hover:text-[#E10600] transition-colors">
                  {p2.driver_name}
                </h3>
                <p className="text-xs text-[#8A8A96] uppercase font-heading">
                  {p2.driver_code} // {p2.constructor_name}
                </p>
                <p className="text-xs text-[#8A8A96] mt-1 font-mono">
                  Started P{p2.qualifying_position}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#8A8A96]">
                    PODIUM CHANCE
                  </span>
                  <span className="text-2xl font-black italic font-heading text-white">
                    {p2.podium_probability}%
                  </span>
                </div>
                <div className="w-full bg-[#0A0A0D] h-2 mt-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, p2.podium_probability)}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="h-full bg-slate-300"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* P1 - Top Step (Center, Tallest, Gold Accent) */}
          {p1 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => onSelectDriver(p1)}
              className="f1-panel p-6 cursor-pointer hover:border-[#E10600]/80 transition-all group relative flex flex-col justify-between min-h-[260px] border-t-4 border-t-amber-400 bg-[#1D1D26] shadow-[0_15px_35px_rgba(0,0,0,0.8)]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 flex items-center justify-center bg-amber-400 text-black font-black font-heading text-2xl -skew-x-12 shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                    P1
                  </span>
                  <span
                    className="w-4 h-7 clip-slanted-edge"
                    style={{ backgroundColor: p1.constructor_color }}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                  PROBABLE WINNER // TOP STEP
                </span>
                <h3 className="text-2xl sm:text-3xl font-black italic uppercase font-heading text-white group-hover:text-[#E10600] transition-colors">
                  {p1.driver_name}
                </h3>
                <p className="text-sm text-[#8A8A96] uppercase font-heading">
                  {p1.driver_code} // {p1.constructor_name}
                </p>
                <p className="text-xs text-[#8A8A96] mt-1 font-mono">
                  Started P{p1.qualifying_position}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#8A8A96]">
                    PODIUM CHANCE
                  </span>
                  <span className="text-3xl font-black italic font-heading text-amber-400">
                    {p1.podium_probability}%
                  </span>
                </div>
                <div className="w-full bg-[#0A0A0D] h-2.5 mt-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, p1.podium_probability)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full bg-amber-400"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* P3 - Third Step (Right, Bronze Accent) */}
          {p3 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => onSelectDriver(p3)}
              className="f1-panel p-5 cursor-pointer hover:border-white/30 transition-all group relative flex flex-col justify-between min-h-[200px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-amber-700 text-white font-black font-heading text-lg -skew-x-12 shadow">
                    P3
                  </span>
                  <span
                    className="w-3 h-6 clip-slanted-edge"
                    style={{ backgroundColor: p3.constructor_color }}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase font-heading text-white group-hover:text-[#E10600] transition-colors">
                  {p3.driver_name}
                </h3>
                <p className="text-xs text-[#8A8A96] uppercase font-heading">
                  {p3.driver_code} // {p3.constructor_name}
                </p>
                <p className="text-xs text-[#8A8A96] mt-1 font-mono">
                  Started P{p3.qualifying_position}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#8A8A96]">
                    PODIUM CHANCE
                  </span>
                  <span className="text-2xl font-black italic font-heading text-white">
                    {p3.podium_probability}%
                  </span>
                </div>
                <div className="w-full bg-[#0A0A0D] h-2 mt-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, p3.podium_probability)}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full bg-amber-700"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* FULL TIMING-TOWER LEADERBOARD */}
      <div className="f1-panel p-6 clip-angled-tl-br space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider font-heading text-white">
              TIMING TOWER // FULL CLASSIFICATION
            </h2>
            <p className="text-xs text-[#8A8A96]">
              Tap any driver row to inspect the exact 21 predictor features used in calculation.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8A8A96]">
            RANKED BY INDEPENDENT PODIUM PROBABILITY
          </span>
        </div>

        {/* Leaderboard Table / Cards */}
        <div className="space-y-1.5">
          {leaderboard.map((item, index) => {
            const isPodiumRank = item.rank <= 3;

            return (
              <motion.div
                key={item.driver_name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onSelectDriver(item)}
                className={`p-3 min-h-[50px] bg-[#14141A] border transition-all cursor-pointer flex items-center justify-between gap-2 sm:gap-4 group ${
                  isPodiumRank
                    ? 'border-[#E10600]/40 hover:border-[#E10600] bg-[#1A1A22]'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {/* Left: Rank, Code, Team Bar, Name */}
                <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                  {/* Rank Badge */}
                  <span
                    className={`w-7 sm:w-8 text-center text-base sm:text-lg font-black font-heading ${
                      item.rank === 1
                        ? 'text-amber-400'
                        : item.rank === 2
                        ? 'text-slate-300'
                        : item.rank === 3
                        ? 'text-amber-600'
                        : 'text-[#8A8A96]'
                    }`}
                  >
                    {item.rank}
                  </span>

                  {/* Team Color Bar */}
                  <span
                    className="w-2 h-7 shrink-0 clip-slanted-edge"
                    style={{ backgroundColor: item.constructor_color }}
                  />

                  {/* Driver Code & Name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-white/10 text-white">
                        {item.driver_code}
                      </span>
                      <span className="text-sm sm:text-base font-bold font-heading uppercase text-white group-hover:text-[#E10600] transition-colors">
                        {item.driver_name}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-[#8A8A96] uppercase font-heading block">
                      {item.constructor_name}
                    </span>
                  </div>
                </div>

                {/* Right: Grid Start, Progress Bar & Percentage */}
                <div className="flex items-center gap-3 sm:gap-6 ml-auto">
                  {/* Qualifying Grid Badge */}
                  <span className="hidden sm:inline-block text-xs font-mono text-[#8A8A96] bg-white/5 px-2 py-1">
                    Grid P{item.qualifying_position}
                  </span>

                  {/* Probability Bar */}
                  <div className="w-20 sm:w-36 h-2 bg-[#0A0A0D] overflow-hidden hidden sm:block">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isPodiumRank ? 'bg-[#E10600]' : 'bg-white/40'
                      }`}
                      style={{ width: `${Math.min(100, item.podium_probability)}%` }}
                    />
                  </div>

                  {/* Probability Value */}
                  <span
                    className={`text-base sm:text-lg font-black italic font-heading w-16 sm:w-20 text-right ${
                      isPodiumRank ? 'text-[#E10600]' : 'text-white'
                    }`}
                  >
                    {item.podium_probability}%
                  </span>

                  <ChevronRight className="w-4 h-4 text-[#8A8A96] group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
