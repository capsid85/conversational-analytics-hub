import React from 'react';

export default function SkeletonLoader({ type }) {
  // 1. Insights & Chart Skeleton
  if (type === 'insights') {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Summary Card Skeleton */}
        <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-3">
          <div className="h-3 bg-indigo-500/10 rounded w-24"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="border border-slate-800 bg-slate-950/40 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-slate-800 rounded w-32"></div>
            <div className="h-2.5 bg-slate-800 rounded w-16"></div>
          </div>
          
          {/* Pulsing bars/columns placeholder */}
          <div className="h-56 bg-slate-900/20 border border-slate-900 rounded-xl flex items-end p-4 gap-4 justify-around">
            <div className="h-1/3 bg-slate-800/40 rounded w-10"></div>
            <div className="h-2/3 bg-slate-800/40 rounded w-10"></div>
            <div className="h-1/2 bg-slate-800/40 rounded w-10"></div>
            <div className="h-4/5 bg-slate-800/40 rounded w-10"></div>
            <div className="h-1/4 bg-slate-800/40 rounded w-10"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Table Data Skeleton
  if (type === 'table') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-900 rounded w-36"></div>
          <div className="h-8 bg-slate-900 rounded w-24"></div>
        </div>
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          {/* Table Header Skeleton */}
          <div className="bg-slate-900/80 px-4 py-3 flex gap-4 border-b border-slate-800">
            <div className="h-3.5 bg-slate-800 rounded w-1/4"></div>
            <div className="h-3.5 bg-slate-800 rounded w-1/4"></div>
            <div className="h-3.5 bg-slate-800 rounded w-1/4"></div>
            <div className="h-3.5 bg-slate-800 rounded w-1/4"></div>
          </div>
          {/* Table Rows Skeleton */}
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                <div className="h-3 bg-slate-800 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. SQL Code Block Skeleton
  return (
    <div className="space-y-4 animate-pulse">
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-850">
          <div className="h-3 bg-slate-800 rounded w-28"></div>
          <div className="h-3.5 bg-slate-850 rounded w-10"></div>
        </div>
        <div className="p-4 space-y-2 font-mono">
          <div className="h-4 bg-slate-900 rounded w-5/6"></div>
          <div className="h-4 bg-slate-900 rounded w-4/6"></div>
          <div className="h-4 bg-slate-900 rounded w-2/3"></div>
        </div>
      </div>
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3">
        <div className="h-7 w-7 bg-indigo-500/10 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-indigo-500/20 rounded w-24"></div>
          <div className="h-3.5 bg-slate-800 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}
