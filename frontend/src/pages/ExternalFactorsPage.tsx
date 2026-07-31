import { useState } from 'react';
import { useExternalFactors, useToggleExternalFactor } from '../lib/api-hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

const FACTOR_ICONS: Record<string, string> = { weather: '🌤️', macroeconomic: '📊', competitive: '🏪', calendar: '📅', custom: '🔧' };

export default function ExternalFactorsPage() {
  const { data, loading, refetch } = useExternalFactors();
  const toggle = useToggleExternalFactor();
  const [selectedFactor, setSelectedFactor] = useState(0);
  const factors = data?.factors ?? [];
  const current = factors[selectedFactor];
  return (
    <FeaturePageShell title="External Factor Modeling" description="Weather, macro, competitive, and calendar factor correlations with demand">
      {loading && <div className="text-gray-400 p-8">Loading external factors...</div>}
      {!loading && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[{label:'Factors Tracked',v:factors.length},{label:'Enabled',v:factors.filter(f=>f.enabled).length},{label:'SKUs Correlated',v:data.skuCorrelations?.length ?? 0},{label:'Last Synced',v:new Date(data.lastSynced).toLocaleDateString()}].map(s => (
              <div key={s.label} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">{s.label}</span><div className="text-lg font-bold text-white">{s.v}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2">
              {factors.map((f, i) => (
                <div key={f.id} onClick={() => setSelectedFactor(i)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${i === selectedFactor ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-[#1e293b] border border-gray-700/50 hover:border-gray-500'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{FACTOR_ICONS[f.type] || '📊'}</span>
                    <div><div className="text-white text-sm font-medium">{f.name}</div><div className="text-gray-500 text-xs">{f.type} {f.correlation != null ? `· r=${f.correlation}` : ''}</div></div>
                  </div>
                  <button onClick={async (e) => { e.stopPropagation(); await toggle.execute(f.id, !f.enabled); refetch(); }} className={`w-10 h-5 rounded-full transition-colors ${f.enabled ? 'bg-orange-500' : 'bg-gray-700'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2">
              {current && (
                <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-white font-semibold mb-2">{current.name} <span className="text-xs text-gray-500 font-normal">({current.type})</span></h3>
                  <p className="text-gray-400 text-xs mb-4">{current.description} {current.lagDetected != null ? `· Lag detected: ${current.lagDetected}w` : ''}</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={current.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:10}} />
                      <YAxis tick={{fill:'#94a3b8'}} />
                      <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                      <Legend />
                      <Area type="monotone" dataKey="value" name={current.name} stroke={current.enabled ? '#f97316' : '#64748b'} fill={current.enabled ? '#f97316' : '#64748b'} fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          {data.skuCorrelations && data.skuCorrelations.length > 0 && (
            <div className="bg-[#1e293b] rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50"><h3 className="text-white font-semibold">SKU-Factor Correlations</h3></div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-700/50 sticky top-0 bg-[#1e293b]">
                    <th className="text-left px-4 py-3">SKU</th>{factors.slice(0,5).map(f => <th key={f.id} className="text-center px-3 py-3">{f.name.split('(')[0].trim()}</th>)}
                  </tr></thead>
                  <tbody>{data.skuCorrelations.slice(0,15).map(sc => (
                    <tr key={sc.skuId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{sc.skuName}</td>
                      {sc.correlations.slice(0,5).map((c, i) => (
                        <td key={i} className={`px-3 py-3 text-center ${Math.abs(c.correlation) > 0.3 ? 'text-orange-400 font-medium' : 'text-gray-400'}`}>{c.correlation.toFixed(2)}</td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </FeaturePageShell>
  );
}
