/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ChartData {
  id: string;
  label: string;
  votes: number;
  percentage: number;
  isCorrect?: boolean;
  showCorrectBorder?: boolean;
}

interface AnimatedChartsProps {
  data: ChartData[];
  type: 'bar' | 'donut' | 'pie';
  themeColor: 'indigo' | 'coral' | 'emerald' | 'amber' | 'slate' | 'cyber';
  totalVotes: number;
}

const themeStyles = {
  indigo: {
    bg: 'bg-indigo-600/10',
    bar: 'bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.35)]',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    colors: ['#6366f1', '#a855f7', '#ec4899', '#818cf8', '#c084fc']
  },
  coral: {
    bg: 'bg-rose-600/10',
    bar: 'bg-gradient-to-r from-rose-600 to-rose-450 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    colors: ['#f43f5e', '#f97316', '#fb7185', '#fdba74', '#fda4af']
  },
  emerald: {
    bg: 'bg-emerald-600/10',
    bar: 'bg-gradient-to-r from-emerald-600 to-teal-450 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    colors: ['#10b981', '#14b8a6', '#34d399', '#2dd4bf', '#6ee7b7']
  },
  amber: {
    bg: 'bg-amber-600/10',
    bar: 'bg-gradient-to-r from-amber-600 to-amber-450 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    colors: ['#f59e0b', '#eab308', '#fbbf24', '#fef08a', '#fda4af']
  },
  slate: {
    bg: 'bg-slate-600/10',
    bar: 'bg-gradient-to-r from-slate-650 to-slate-400 rounded-full shadow-[0_0_20px_rgba(148,163,184,0.35)]',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    colors: ['#64748b', '#71717a', '#94a3b8', '#a1a1aa', '#cbd5e1']
  },
  cyber: {
    bg: 'bg-cyan-950/40',
    bar: 'bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)]',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    colors: ['#22d3ee', '#d946ef', '#facc15', '#fb7185', '#4ade80']
  }
};

export const AnimatedCharts: React.FC<AnimatedChartsProps> = ({
  data,
  type,
  themeColor,
  totalVotes
}) => {
  const styles = themeStyles[themeColor] || themeStyles.indigo;

  // Sorting descending for the list but keep exact indexes if requested
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.votes - a.votes);
  }, [data]);

  // Donut/Pie variables
  const radius = 65;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Compute offsets for concentric donut portions
  const donutSegments = useMemo(() => {
    let accumulatedPercentage = 0;
    return data.map((item, idx) => {
      const percentage = totalVotes > 0 ? (item.votes / totalVotes) * 100 : 0;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = circumference - ((accumulatedPercentage / 100) * circumference);
      accumulatedPercentage += percentage;
      
      const color = styles.colors[idx % styles.colors.length];
      return {
        ...item,
        percentage,
        strokeLength,
        strokeOffset,
        color
      };
    });
  }, [data, totalVotes, circumference, styles.colors]);

  return (
    <div className="w-full">
      {type === 'bar' && (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {sortedData.map((item, idx) => {
              const percentage = totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0;
              const isFirst = idx === 0 && item.votes > 0;
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-3xl border bg-slate-900/30 backdrop-blur-sm ${
                    item.showCorrectBorder
                      ? 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-950/5'
                      : 'border-slate-800/80 hover:border-slate-700/60'
                  } transition-all duration-300`}
                  id={`item-card-${item.id}`}
                >
                  <div className="flex justify-between items-center mb-2.5 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-100">
                      <span className="font-display font-medium text-slate-200">{item.label}</span>
                      {item.isCorrect && (
                        <span className="px-2 py-0.5 text-xxs font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          CORRECT
                        </span>
                      )}
                      {isFirst && (
                        <span className="px-2 py-0.5 text-xxs font-bold uppercase rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400">
                        {item.votes} {item.votes === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className={`font-mono text-lg font-bold ${styles.text}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progressive track wrapper */}
                  <div className="h-8 w-full bg-slate-950/60 rounded-full overflow-hidden p-1 border border-slate-850/80 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full relative ${styles.bar}`}
                    >
                      {/* Subtle stripe glaze effect */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-80" />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {(type === 'donut' || type === 'pie') && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
          <div className="relative w-48 h-48 select-none">
            {/* Base SVG Ring container */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Outer transparent shadow back-ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800"
                strokeWidth={type === 'donut' ? strokeWidth : radius * 1.5}
                fill="none"
              />

              {/* Dynamic segments */}
              {donutSegments.map((segment) => {
                const isSelected = segment.votes > 0;
                if (!isSelected) return null;

                return (
                  <motion.circle
                    key={segment.id}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    className="transition-all duration-300"
                    stroke={segment.color}
                    strokeWidth={type === 'donut' ? strokeWidth : radius * 1.0}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: segment.strokeOffset }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    strokeLinecap="round"
                    style={{
                      transformOrigin: '80px 80px',
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner dynamic content overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-400 font-medium">Total Votes</span>
              <motion.span
                key={totalVotes}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                tabIndex={0}
                className="text-3xl font-extrabold text-white font-mono"
              >
                {totalVotes}
              </motion.span>
            </div>
          </div>

          {/* Side Legenda indicator block */}
          <div className="flex-1 w-full max-w-sm space-y-2.5">
            {donutSegments.map((item, idx) => {
              const textPercent = Math.round(item.percentage);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-800/40 bg-slate-900/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 border"
                      style={{
                        backgroundColor: item.color,
                        borderColor: `${item.color}50`
                      }}
                    />
                    <span className="text-slate-200 font-medium truncate max-w-[150px]">
                      {item.label}
                    </span>
                    {item.isCorrect && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        OK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-xs text-slate-400">
                      {item.votes}
                    </span>
                    <span className="text-slate-100 font-bold w-10 text-right">
                      {textPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
