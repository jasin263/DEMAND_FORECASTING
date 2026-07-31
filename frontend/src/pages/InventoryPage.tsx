import { useState } from 'react';
import { useInventoryOptimization } from '../lib/api-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

const COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899'];

export default function InventoryPage() {
  const [sl, setSl] = useState(0.975);
  const [lt, setLt] = useState(14);
  const { data, loading } = useInventoryOptimization({ serviceLevel: sl, leadTimeDays: lt });
  const skus = data?.skus ?? [];
  return (
    <FeaturePageShell title="Inventory Optimization" description="Safety stock, reorder points, EOQ, and service-level-driven replenishment">
      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4">Policy Parameters</h3>
          <div className="flex gap-6">
            <div><label className="text-gray-400 text-xs block mb-1">Service Level Target</label><input type="range" min={0.8} max={0.999} step={0.001} value={sl} onChange={e => setSl(parseFloat(e.target.value))} className="w-40 accent-orange-500" /><span className="text-white text-sm ml-2">{(sl*100).toFixed(1)}%</span></div>
            <div><label className="text-gray-400 text-xs block mb-1">Lead Time (days)</label><input type="range" min={1} max={90} step={1} value={lt} onChange={e => setLt(parseInt(e.target.value))} className="w-40 accent-orange-500" /><span className="text-white text-sm ml-2">{lt}d</span></div>
          </div>
        </div>
        {loading && <div className="text-gray-400 p-8">Optimizing inventory...</div>}
        {!loading && data && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Total Safety Stock</span><div className="text-2xl font-bold text-white">{data.totalSafetyStock.toLocaleString()}</div></div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Avg Service Level</span><div className="text-2xl font-bold text-white">{(data.avgServiceLevel*100).toFixed(1)}%</div></div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Annual Holding Cost</span><div className="text-2xl font-bold text-white">${data.totalAnnualHoldingCost.toLocaleString()}</div></div>
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">SKUs Optimized</span><div className="text-2xl font-bold text-white">{skus.length}</div></div>
            </div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-white font-semibold mb-4">Safety Stock & Reorder Point by SKU</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skus.slice(0,15).map(s => ({ name: s.skuName.length > 10 ? s.skuName.slice(0,10)+'..' : s.skuName, safety: s.safetyStock, reorder: s.reorderPoint, eoq: s.economicOrderQty }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:10}} />
                  <YAxis tick={{fill:'#94a3b8'}} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                  <Legend />
                  <Bar dataKey="safety" name="Safety Stock" fill="#f97316" radius={[4,4,0,0]} />
                  <Bar dataKey="reorder" name="Reorder Point" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="eoq" name="EOQ" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#1e293b] rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50"><h3 className="text-white font-semibold">All SKU Inventory Recommendations</h3></div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-700/50 sticky top-0 bg-[#1e293b]">
                    <th className="text-left px-4 py-3">SKU</th><th className="text-center px-3 py-3">Safety</th><th className="text-center px-3 py-3">Reorder</th><th className="text-center px-3 py-3">EOQ</th><th className="text-center px-3 py-3">Target</th><th className="text-center px-3 py-3">Fill Rate</th><th className="text-center px-3 py-3">Stockout</th><th className="text-center px-3 py-3">Hold Cost</th>
                  </tr></thead>
                  <tbody>{skus.map(s => (
                    <tr key={s.skuId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{s.skuName}</td>
                      <td className="px-3 py-3 text-center text-orange-400">{s.safetyStock.toFixed(0)}</td>
                      <td className="px-3 py-3 text-center text-blue-400">{s.reorderPoint.toFixed(0)}</td>
                      <td className="px-3 py-3 text-center text-emerald-400">{s.economicOrderQty.toFixed(0)}</td>
                      <td className="px-3 py-3 text-center">{s.targetStock.toFixed(0)}</td>
                      <td className="px-3 py-3 text-center text-emerald-400">{s.projectedFillRate}%</td>
                      <td className="px-3 py-3 text-center text-red-400">{s.stockoutProbability}%</td>
                      <td className="px-3 py-3 text-center text-yellow-400">${s.annualHoldingCost.toFixed(0)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </FeaturePageShell>
  );
}
