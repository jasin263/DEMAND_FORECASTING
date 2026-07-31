import { useState } from 'react';
import { useSeasonalDecomposition } from '../lib/api-hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

export default function SeasonalDecompPage() {
  const [selected, setSelected] = useState(0);
  const { data, loading, error } = useSeasonalDecomposition({ period: 52 });
  const skus = data?.skus ?? [];
  const current = skus[selected];
  return (
    <FeaturePageShell title="Seasonality Decomposition" description="Trend, seasonal, and residual breakdown per SKU">
      {loading && <div className="text-gray-400 p-8">Computing decomposition...</div>}
      {!loading && error && <div className="text-negative p-8">Failed to load decomposition: {error}</div>}
      {!loading && !error && skus.length === 0 && <div className="text-gray-500 p-8">Not enough history for decomposition.</div>}
      {data && skus.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[{label:'SKUs Analyzed',v:skus.length},{label:'Method',v:data.method},{label:'Period',v:`${data.period}w`},{label:'Category',v:current?.category}].map(s => (
              <div key={s.label} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">{s.label}</span><div className="text-lg font-bold text-white">{s.v}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {skus.slice(0,20).map((s, i) => (
              <button key={s.skuId} onClick={() => setSelected(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${i === selected ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'}`}>{s.skuName.length > 15 ? s.skuName.slice(0,15)+'..' : s.skuName}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Seasonal Strength</span><div className="text-xl font-bold text-white">{current?.seasonalStrength ?? '-'} <span className="text-xs text-gray-400">/ 1.0</span></div></div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Dominant Period</span><div className="text-xl font-bold text-white">{current?.dominantPeriod ?? '-'} weeks</div></div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Trend Direction</span><div className="text-xl font-bold text-white capitalize">{current?.trendDirection ?? '-'}</div></div>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-4">Decomposition Components — {current?.skuName}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={current?.components?.slice(-52) ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" tick={{fill:'#94a3b8',fontSize:10}} />
                <YAxis tick={{fill:'#94a3b8'}} />
                <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                <Legend />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                <Area type="monotone" dataKey="trend" name="Trend" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-4">Seasonal Pattern & Residuals</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={current?.components?.slice(-52) ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" tick={{fill:'#94a3b8',fontSize:10}} />
                <YAxis tick={{fill:'#94a3b8'}} />
                <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                <Legend />
                <Line type="monotone" dataKey="seasonal" name="Seasonal" stroke="#10b981" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="residual" name="Residual" stroke="#8b5cf6" dot={false} strokeWidth={1} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </FeaturePageShell>
  );
}
