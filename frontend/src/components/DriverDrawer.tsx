import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, Info } from 'lucide-react';
import type { PredictionDriver } from '../types';

interface DriverDrawerProps {
  driver: PredictionDriver | null;
  onClose: () => void;
  predictorGroups: Record<string, string[]>;
}

export const DriverDrawer: React.FC<DriverDrawerProps> = ({
  driver,
  onClose,
  predictorGroups,
}) => {
  if (!driver) return null;

  // Format feature values for display
  const formatFeatureValue = (key: string, val: number | null | undefined) => {
    if (val === null || val === undefined || Number.isNaN(val)) {
      return (
        <span className="text-xs uppercase font-mono px-2 py-0.5 bg-white/5 text-[#8A8A96] border border-white/5">
          no history
        </span>
      );
    }

    if (key === 'q1_time') {
      const mins = Math.floor(val / 60);
      const secs = (val % 60).toFixed(3);
      return `${mins}:${secs.padStart(6, '0')} (${val.toFixed(3)}s)`;
    }

    if (key.includes('rate')) {
      return `${(val * 100).toFixed(1)}%`;
    }

    if (key === 'driver_age') {
      return `${val.toFixed(1)} yrs`;
    }

    if (Number.isInteger(val)) {
      return val.toString();
    }

    return val.toFixed(2);
  };

  const friendlyName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-[#14141A] border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 bg-[#1A1A21] relative f1-panel">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center text-[#8A8A96] hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Close calculation drawer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-3.5 h-7 inline-block clip-slanted-edge"
                  style={{ backgroundColor: driver.constructor_color }}
                />
                <span className="text-sm font-black font-heading tracking-widest text-[#8A8A96] uppercase">
                  {driver.driver_code} // {driver.constructor_name}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black italic tracking-wide text-white font-heading">
                {driver.driver_name}
              </h3>

              <div className="mt-4 flex items-center justify-between p-3 bg-[#0A0A0D] border border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block">
                    PREDICTED PODIUM CHANCE
                  </span>
                  <span className="text-2xl font-black italic font-heading text-[#E10600]">
                    {driver.podium_probability}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A8A96] block">
                    STARTING GRID
                  </span>
                  <span className="text-2xl font-black italic font-heading text-white">
                    P{driver.qualifying_position}
                  </span>
                </div>
              </div>

              {/* Race Date Note */}
              <div className="mt-3 flex items-center gap-2 text-xs text-[#8A8A96]">
                <Calendar className="w-3.5 h-3.5 text-[#E10600]" />
                <span>
                  Race Date:{' '}
                  <strong className="text-white">{driver.race_date}</strong>
                  {driver.is_approx_date && (
                    <span className="ml-1 text-[10px] text-amber-400 font-mono">
                      (Calendar estimate)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Feature Breakdown Groups */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 p-2.5 bg-[#0A0A0D] border border-white/5 text-xs text-[#8A8A96]">
                <Info className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>
                  Exact 21 model inputs computed strictly from races prior to this event. Missing prior data passes as raw NaN.
                </span>
              </div>

              {Object.entries(predictorGroups).map(([groupName, featureKeys]) => (
                <div key={groupName} className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/70 font-heading border-b border-white/5 pb-1 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-[#E10600]" />
                    {groupName}
                  </h4>

                  <div className="space-y-1.5">
                    {featureKeys.map((fKey) => {
                      const val = driver.features[fKey];
                      return (
                        <div
                          key={fKey}
                          className="flex items-center justify-between py-1.5 px-2.5 bg-[#1A1A21]/70 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <span className="text-xs text-[#8A8A96]">
                            {friendlyName(fKey)}
                          </span>
                          <span className="text-xs font-bold font-mono text-white">
                            {formatFeatureValue(fKey, val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-[#1A1A21] text-center">
              <button
                onClick={onClose}
                className="w-full min-h-[44px] py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider font-heading transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
