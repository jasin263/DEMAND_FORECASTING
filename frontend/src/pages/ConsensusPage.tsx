import { useState } from 'react';
import { useConsensus } from '../lib/api-hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

export default function ConsensusPage() {
  const { data, loading, error } = useConsensus();
  const [selected, setSelected] = useState(0);
  const results = data?.results ?? [];
  const current = results[selected];
  return (
    <FeaturePageShell title="Consensus / Blended Forecast" description="ML + statistical + judgmental forecasts merged into a single consensus view">
      {loading && <div className="text-gray-400 p-8">Computing blended forecasts...</div>}
      {!loading && error && <div className="text-negative p-8">Failed to load consensus data: {error}</div>}
      {!loading && !error && results.length === 0 && <div className="text-gray-500 p-8">No consensus data available.</div>}
      {data && results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[{label:'SKUs Blended',v:results.length},{label:'Method',v:'Adaptive Weighted'},{label:'Overall MAPE',v:data.overallBlendedMape != null ? `${data.overallBlendedMape}%` : 'N/A'},{label:'Weights',v:`ML: ${(data.globalConfig.mlWeight*100)}% · Stat: ${(data.globalConfig.statisticalWeight*100)}% · Judg: ${(data.globalConfig.judgmentalWeight*100)}%`}].map(s => (
              <div key={s.label} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">{s.label}</span><div className="text-lg font-bold text-white">{s.v}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {results.slice(0,20).map((r, i) => (
              <button key={r.skuId} onClick={() => setSelected(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${i === selected ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'}`}>{r.skuName.length > 15 ? r.skuName.slice(0,15)+'..' : r.skuName}</button>
            ))}
          </div>
          {current && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[{label:'Blended MAPE',v:current.blendedMape != null ? `${current.blendedMape}%` : '—',color:'text-orange-400'},
                  {label:'ML MAPE',v:current.mlMape != null ? `${current.mlMape}%` : '—',color:'text-blue-400'},
                  {label:'Statistical MAPE',v:current.statMape != null ? `${current.statMape}%` : '—',color:'text-emerald-400'}].map(s => (
                  <div key={s.label} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">{s.label}</span><div className={`text-2xl font-bold ${s.color}`}>{s.v}</div></div>
                ))}
              </div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">Forecast Components — {current.skuName}</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={current.forecasts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" tick={{fill:'#94a3b8',fontSize:10}} />
                    <YAxis tick={{fill:'#94a3b8'}} />
                    <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                    <Legend />
                    <Area type="monotone" dataKey="mlForecast" name="ML Forecast" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="statisticalForecast" name="Statistical" stroke="#10b981" fill="#10b981" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="judgmentalForecast" name="Judgmental" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="blendedP50" name="Blended P50" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">Effective Weights</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={[current.effectiveWeights]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" domain={[0,1]} tick={{fill:'#94a3b8',fontSize:11}} />
                    <YAxis type="category" dataKey="name" tick={{fill:'#94a3b8'}} hide />
                    <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                    <Legend />
                    <Bar dataKey="ml" name="ML" fill="#3b82f6" radius={[0,4,4,0]} />
                    <Bar dataKey="statistical" name="Statistical" fill="#10b981" radius={[0,4,4,0]} />
                    <Bar dataKey="judgmental" name="Judgmental" fill="#8b5cf6" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </FeaturePageShell>
  );
}
