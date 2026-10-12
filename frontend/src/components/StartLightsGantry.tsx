import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface StartLightsGantryProps {
  onComplete: () => void;
}

export const StartLightsGantry: React.FC<StartLightsGantryProps> = ({ onComplete }) => {
  const [litCount, setLitCount] = useState<number>(0);
  const [lightsOut, setLightsOut] = useState<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      onComplete();
      return;
    }

    // Sequence: 5 lights turn on one by one at ~400ms intervals
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setLitCount(1), 350));
    timers.push(setTimeout(() => setLitCount(2), 750));
    timers.push(setTimeout(() => setLitCount(3), 1150));
    timers.push(setTimeout(() => setLitCount(4), 1550));
    timers.push(setTimeout(() => setLitCount(5), 1950));

    // Tension pause then lights out!
    timers.push(
      setTimeout(() => {
        setLightsOut(true);
      }, 2600)
    );

    // Call onComplete right after lights extinguish
    timers.push(
      setTimeout(() => {
        onComplete();
      }, 2900)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete, shouldReduceMotion]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0D]/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A21] border border-[#E10600]/40 text-[#E10600] text-xs uppercase font-bold tracking-widest mb-3">
          <span className="w-2 h-2 rounded-full bg-[#E10600] animate-ping" />
          START SEQUENCE INITIATED
        </div>
        <h2 className="text-3xl sm:text-5xl font-black italic tracking-wider text-white font-heading">
          {lightsOut ? "LIGHTS OUT AND AWAY WE GO!" : "COMPUTING TELEMETRY..."}
        </h2>
      </div>

      {/* 5-Light F1 Gantry */}
      <div className="bg-[#14141A] border-2 border-[#2D2D38] p-4 sm:p-6 shadow-2xl flex items-center justify-center gap-3 sm:gap-6 clip-angled-corner">
        {[1, 2, 3, 4, 5].map((lightIdx) => {
          const isLit = !lightsOut && litCount >= lightIdx;

          return (
            <div
              key={lightIdx}
              className="flex flex-col items-center gap-2 p-2 sm:p-3 bg-[#0A0A0D] border border-white/5"
            >
              {/* Top unlit indicator */}
              <div className="w-2 h-2 rounded-full bg-[#25252E]" />

              {/* Red racing light */}
              <motion.div
                initial={false}
                animate={{
                  scale: isLit ? 1.05 : 1,
                  boxShadow: isLit
                    ? '0 0 35px 8px rgba(225, 6, 0, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.8)'
                    : 'none',
                }}
                className={`w-9 h-9 sm:w-14 sm:h-14 rounded-full border-2 transition-colors duration-150 ${
                  isLit
                    ? 'bg-[#FF1A1A] border-white'
                    : 'bg-[#251010] border-[#3D1E1E]'
                }`}
              />

              {/* Bottom cluster dot */}
              <div className="w-2 h-2 rounded-full bg-[#25252E]" />
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs sm:text-sm text-[#8A8A96] tracking-widest uppercase font-mono">
        STAND BY FOR XGBOOST PODIUM CLASSIFICATION
      </p>
    </div>
  );
};
