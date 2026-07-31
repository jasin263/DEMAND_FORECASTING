import { useState } from 'react';
import { useDemandSensing } from '../lib/api-hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

export default function DemandSensingPage() {
  const { data, loading, error } = useDemandSensing();
  const [selected, setSelected] = useState(0);
  const results = data?.results ?? [];
  const current = results[selected];
  return (
    <FeaturePageShell title="Demand Sensing" description="Short-term signal blending across POS, sell-in, sell-out, and stock channels">
      {loading && <div className="text-gray-400 p-8">Sensing signals...</div>}
      {!loading && error && <div className="text-negative p-8">Failed to load sensing data: {error}</div>}
      {!loading && !error && results.length === 0 && <div className="text-gray-500 p-8">No sensing data available.</div>}
      {data && results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[{label:'SKUs Tracked',v:results.length},{label:'Pos Weight',v:`${(data.globalConfig.posWeight*100)}%`},{label:'Sell-In Weight',v:`${(data.globalConfig.sellInWeight*100)}%`},{label:'Smooth Window',v:`${data.globalConfig.smoothingWindow}w`}].map(s => (
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
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">Raw Signals — {current.skuName}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={current.signals.slice(-26)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:10}} />
                    <YAxis tick={{fill:'#94a3b8'}} />
                    <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                    <Legend />
                    <Area type="monotone" dataKey="pos" name="POS" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="sellIn" name="Sell-In" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="sellOut" name="Sell-Out" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">Blended Signal (smoothed)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={current.signals.slice(-26)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:10}} />
                    <YAxis tick={{fill:'#94a3b8'}} />
                    <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                    <Legend />
                    <Line type="monotone" dataKey="blended" name="Blended" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="storeStock" name="Store Stock" stroke="#f59e0b" dot={false} strokeWidth={1} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="warehouseStock" name="Warehouse Stock" stroke="#06b6d4" dot={false} strokeWidth={1} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </FeaturePageShell>
  );
}
