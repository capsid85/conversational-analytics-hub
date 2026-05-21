import React, { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';

const PALETTE = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const PALETTE_GRADIENTS = [
  { start: '#6366f1', end: '#4f46e5' },
  { start: '#8b5cf6', end: '#7c3aed' },
  { start: '#10b981', end: '#059669' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#ef4444', end: '#dc2626' },
  { start: '#ec4899', end: '#db2777' },
  { start: '#06b6d4', end: '#0891b2' },
];

export default function Visualization({ columns, results }) {
  
  const chartConfig = useMemo(() => {
    if (!results || results.length === 0) return null;
    
    const sample = results[0];
    const keys = Object.keys(sample);
    
    let xAxisKey = null;
    let yAxisKey = null;
    
    // Look for string columns for X-axis and numeric columns for Y-axis
    for (let k of keys) {
      const val = sample[k];
      if (typeof val === 'string' && !xAxisKey) {
        xAxisKey = k;
      } else if (typeof val === 'number' && !yAxisKey) {
        yAxisKey = k;
      }
    }
    
    // Fallbacks
    if (!xAxisKey) xAxisKey = keys[0];
    if (!yAxisKey) yAxisKey = keys[1] || keys[0];
    
    // If the y-axis is still not a number (e.g. all string columns), we can't chart properly
    if (typeof sample[yAxisKey] !== 'number') {
      return null;
    }
    
    // Determine chart type:
    // If X-axis values are numbers or represent chronological keys (like age, years, levels), use Area Chart.
    // Otherwise, use Bar Chart.
    const firstXVal = sample[xAxisKey];
    const isNumericX = typeof firstXVal === 'number' || !isNaN(Number(firstXVal));
    const isTrendColumn = xAxisKey.includes('age') || 
                          xAxisKey.includes('year') || 
                          xAxisKey.includes('month') || 
                          xAxisKey.includes('level') ||
                          xAxisKey.includes('rating');
                          
    const chartType = (isNumericX || isTrendColumn) && results.length > 2 ? 'line' : 'bar';
    
    // For trend line charts, sort by X-axis ascending so line renders correctly
    let chartData = [...results];
    if (chartType === 'line') {
      chartData.sort((a, b) => Number(a[xAxisKey]) - Number(b[xAxisKey]));
    }
    
    return {
      type: chartType,
      xAxisKey,
      yAxisKey,
      data: chartData
    };
  }, [results]);

  if (!chartConfig) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 border-2 border-dashed border-slate-800/80 rounded-xl bg-slate-950/20">
        <BarChart3 className="w-8 h-8 mb-2 opacity-50 text-slate-600" />
        <p className="text-xs">No suitable category/metric pairs found to plot a chart.</p>
      </div>
    );
  }

  const { type, xAxisKey, yAxisKey, data } = chartConfig;

  // Custom tooltips for premium aesthetic
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const formattedVal = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val;
      return (
        <div className="bg-slate-950 border border-slate-800/80 px-3.5 py-2.5 rounded-xl text-xs shadow-2xl backdrop-blur-md">
          <p className="font-semibold text-slate-300 mb-1.5">{`${xAxisKey.replace(/_/g, ' ').toUpperCase()}: ${label}`}</p>
          <p className="text-indigo-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>{`${yAxisKey.replace(/_/g, ' ')}: `}</span>
            <span className="text-slate-100 font-bold font-mono">{formattedVal}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Title / Legend */}
      <div className="flex items-center justify-between bg-slate-900/20 px-3 py-2 rounded-lg border border-slate-800/40">
        <div className="flex items-center space-x-2">
          {type === 'line' ? (
            <LineIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
          ) : (
            <BarChart3 className="w-4 h-4 text-emerald-400 animate-pulse" />
          )}
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            {type === 'line' ? 'Chronological Area Trend' : 'Categorical Metric Breakdown'}
          </span>
        </div>
        <div className="text-[9px] text-slate-500 font-mono tracking-wide">
          Axis: {xAxisKey} vs {yAxisKey}
        </div>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.00}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey={yAxisKey} 
                stroke="#6366f1" 
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorArea)"
                dot={{ fill: '#8b5cf6', strokeWidth: 1.5, r: 3.5, stroke: '#1e1b4b' }}
                activeDot={{ r: 5.5, strokeWidth: 0 }}
                animationDuration={1200}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {PALETTE_GRADIENTS.map((grad, i) => (
                  <linearGradient id={`barGrad-${i}`} key={i} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={grad.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={grad.end} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                dy={6}
                tickFormatter={(value) => {
                  const str = String(value);
                  return str.length > 15 ? str.substring(0, 12) + '...' : str;
                }}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={yAxisKey} 
                radius={[5, 5, 0, 0]}
                maxBarSize={38}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGrad-${index % PALETTE_GRADIENTS.length})`} 
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
