import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Cpu, ShieldCheck, Database, Layers, AlertCircle } from 'lucide-react';
import type { ModelInfoResponse } from '../types';

interface ModelViewProps {
  modelInfo: ModelInfoResponse | null;
  isLoading: boolean;
  error: string | null;
}

export const ModelView: React.FC<ModelViewProps> = ({ modelInfo, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-44 bg-[#1A1A21] f1-panel" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#1A1A21] f1-panel" />
          ))}
        </div>
        <div className="h-96 bg-[#1A1A21] f1-panel" />
      </div>
    );
  }

  if (error || !modelInfo) {
    return (
      <div className="p-8 f1-panel text-center max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-[#E10600] mx-auto" />
        <h2 className="text-2xl font-black italic uppercase font-heading text-white">
          Model Telemetry Unavailable
        </h2>
        <p className="text-sm text-[#8A8A96]">
          {error || 'Unable to load real-time model telemetry from the API.'}
        </p>
      </div>
    );
  }

  const {
    model_type,
    hyperparameters,
    feature_importances,
    metrics,
    predictor_groups,
    date_range,
  } = modelInfo;

  // Format feature importance for Recharts
  const chartData = Object.entries(feature_importances || {}).map(([feature, importance]) => ({
    name: feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    rawName: feature,
    importance: Math.round(importance * 1000) / 10, // as percentage
  }));

  return (
    <div className="space-y-10 pb-24">
      {/* Overview Banner */}
      <div className="p-6 sm:p-10 f1-panel clip-angled-tl-br">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[#E10600] uppercase mb-3">
          <Cpu className="w-3.5 h-3.5 text-[#E10600]" />
          TELEMETRY // ALGORITHMIC INTELLIGENCE
        </div>
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase text-white font-heading tracking-tight">
          XGBOOST CLASSIFIER <span className="text-[#E10600]">SPECIFICATIONS</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#8A8A96] max-w-3xl leading-relaxed">
          The prediction engine employs an Extreme Gradient Boosting ({model_type}) algorithm trained to classify whether a Formula 1 driver finishes on the podium (position &le; 3) given 21 pre-race numerical inputs.
        </p>

        {/* Hyperparameters Pill Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase font-bold tracking-widest text-[#8A8A96] font-heading">
            Trained Hyperparameters:
          </span>
          {Object.entries(hyperparameters).map(([param, val]) => (
            <span
              key={param}
              className="text-xs font-mono px-2.5 py-1 bg-[#0A0A0D] border border-white/10 text-white"
            >
              <strong className="text-[#8A8A96]">{param}:</strong> {String(val)}
            </span>
          ))}
        </div>
      </div>

      {/* LIVE-COMPUTED MODEL METRICS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8A8A96] font-heading">
          <ShieldCheck className="w-4 h-4 text-[#E10600]" />
          <span>LIVE EVALUATION METRICS (TEST SET SPLIT 20% // SEED 42 STRATIFIED)</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 f1-panel clip-angled-corner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
              TEST ACCURACY
            </span>
            <span className="text-3xl sm:text-4xl font-black italic font-heading text-white">
              {metrics.accuracy !== undefined ? `${metrics.accuracy}%` : '--'}
            </span>
            <span className="text-[10px] text-[#8A8A96] block mt-1">
              Overall correct classifications
            </span>
          </div>

          <div className="p-5 f1-panel clip-angled-corner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
              ROC-AUC SCORE
            </span>
            <span className="text-3xl sm:text-4xl font-black italic font-heading text-[#E10600]">
              {metrics.roc_auc !== undefined ? metrics.roc_auc : '--'}
            </span>
            <span className="text-[10px] text-[#8A8A96] block mt-1">
              Area under ROC discrimination curve
            </span>
          </div>

          <div className="p-5 f1-panel clip-angled-corner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
              PODIUM PRECISION
            </span>
            <span className="text-3xl sm:text-4xl font-black italic font-heading text-white">
              {metrics.precision !== undefined ? `${metrics.precision}%` : '--'}
            </span>
            <span className="text-[10px] text-[#8A8A96] block mt-1">
              Correctness of positive podium calls
            </span>
          </div>

          <div className="p-5 f1-panel clip-angled-corner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block font-heading">
              PODIUM RECALL
            </span>
            <span className="text-3xl sm:text-4xl font-black italic font-heading text-white">
              {metrics.recall !== undefined ? `${metrics.recall}%` : '--'}
            </span>
            <span className="text-[10px] text-[#8A8A96] block mt-1">
              Proportion of actual podiums captured
            </span>
          </div>
        </div>

        {/* Honest Imbalance Context */}
        <div className="p-4 bg-[#14141A] border-l-4 border-amber-500 text-xs text-[#8A8A96] leading-relaxed">
          <strong className="text-amber-400">Class Imbalance Context:</strong> In Formula 1, only 3 out of ~20 drivers achieve a podium finish per race (historical positive class share: {metrics.podium_class_share || '18.33'}%). A naive baseline always predicting &ldquo;No Podium&rdquo; achieves ~81.7% accuracy. Precision, Recall, and ROC-AUC are therefore reported alongside accuracy to provide a transparent assessment of true podium discrimination capability.
        </div>
      </div>

      {/* FEATURE IMPORTANCE BAR CHART */}
      <div className="f1-panel p-6 sm:p-8 clip-angled-tl-br space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black italic uppercase font-heading text-white">
              FEATURE IMPORTANCE // WEIGHT DISTRIBUTION
            </h2>
            <p className="text-xs text-[#8A8A96]">
              Gain computed directly from model.feature_importances_ across all 21 inputs.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8A8A96]">
            RELATIVE IMPORTANCE (%)
          </span>
        </div>

        <div className="h-[460px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#25252E" horizontal={false} />
              <XAxis
                type="number"
                stroke="#8A8A96"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8A8A96"
                fontSize={11}
                width={140}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#1A1A21] border border-white/20 p-2.5 text-xs shadow-xl">
                        <p className="font-bold text-white font-heading">{data.name}</p>
                        <p className="text-[#8A8A96] font-mono text-[10px]">
                          Feature: {data.rawName}
                        </p>
                        <p className="text-[#E10600] font-black font-heading text-base mt-1">
                          {data.importance}% Weight
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="importance" fill="#E10600" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FULL 21 PREDICTOR CATALOG */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8A8A96] font-heading">
          <Layers className="w-4 h-4 text-[#E10600]" />
          <span>FULL 21 PREDICTORS (GROUPED ARCHITECTURE)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(predictor_groups).map(([group, featureList]) => (
            <div key={group} className="f1-panel p-5 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-heading border-b border-white/10 pb-2 flex items-center justify-between">
                <span>{group}</span>
                <span className="text-[10px] font-mono text-[#E10600]">
                  {featureList.length} inputs
                </span>
              </h3>

              <div className="space-y-1.5">
                {featureList.map((fName) => (
                  <div
                    key={fName}
                    className="p-2 bg-[#0A0A0D] border border-white/5 flex items-center justify-between"
                  >
                    <span className="text-xs font-mono text-white/90 truncate mr-2">
                      {fName}
                    </span>
                    <span className="text-[10px] text-[#8A8A96] font-mono shrink-0">
                      {feature_importances[fName] !== undefined
                        ? `${(feature_importances[fName] * 100).toFixed(1)}%`
                        : '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DATASET RANGE & INTEGRITY */}
      <div className="p-6 f1-panel clip-angled-corner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#E10600] shrink-0" />
          <div>
            <h4 className="text-base font-bold uppercase font-heading text-white">
              Dataset Date Range
            </h4>
            <p className="text-xs text-[#8A8A96]">
              Cleaned historical telemetry from {date_range.min_date || '1994'} to{' '}
              {date_range.max_date || '2026'}.
            </p>
          </div>
        </div>

        <div className="text-xs text-[#8A8A96] font-mono">
          <span>Target Definition: finish_position_numeric &le; 3</span>
        </div>
      </div>
    </div>
  );
};
