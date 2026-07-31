import { useWalkForward } from '../lib/api-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

export default function BacktestingPage() {
  const { data, loading } = useWalkForward({ horizon: 8, nSplits: 5 });
  const top10 = data?.results?.slice(0, 10) ?? [];
  return (
    <FeaturePageShell title="Walk-Forward Backtesting" description="Rolling window validation to assess forecast stability across folds">
      {loading && <div className="text-gray-400 p-8">Loading backtest results...</div>}
      {!loading && !data && <div className="text-gray-500 p-8">No backtest data available.</div>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">SKUs Tested</span><div className="text-2xl font-bold text-white">{data.results.length}</div></div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Horizon</span><div className="text-2xl font-bold text-white">{data.horizon} weeks</div></div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Folds per SKU</span><div className="text-2xl font-bold text-white">{data.nSplits}</div></div>
            <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50"><span className="text-gray-400 text-xs">Method</span><div className="text-2xl font-bold text-white capitalize">{data.method}</div></div>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-4">Avg MAPE by SKU (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10.map(r => ({ name: r.skuName.length > 12 ? r.skuName.slice(0,12)+'...' : r.skuName, mape: r.avgMape, wape: r.avgWape }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} />
                <YAxis tick={{ fill:'#94a3b8' }} unit="%" />
                <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8 }} />
                <Legend />
                <Bar dataKey="mape" name="MAPE %" fill="#f97316" radius={[4,4,0,0]} />
                <Bar dataKey="wape" name="WAPE %" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#1e293b] rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/50"><h3 className="text-white font-semibold">Detailed Fold Results</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-700/50">
                  <th className="text-left px-4 py-3">SKU</th><th className="text-center px-3 py-3">Avg MAPE</th><th className="text-center px-3 py-3">Avg WAPE</th><th className="text-center px-3 py-3">Avg Bias</th><th className="text-center px-3 py-3">Avg Coverage</th><th className="text-center px-3 py-3">Stability</th>
                </tr></thead>
                <tbody>{top10.map(sku => (
                  <tr key={sku.skuId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white">{sku.skuName}</td>
                    <td className="px-3 py-3 text-center text-orange-400">{sku.avgMape}%</td>
                    <td className="px-3 py-3 text-center text-blue-400">{sku.avgWape}%</td>
                    <td className="px-3 py-3 text-center text-purple-400">{sku.avgBias}</td>
                    <td className="px-3 py-3 text-center text-emerald-400">{sku.avgCoverage}%</td>
                    <td className="px-3 py-3 text-center">{sku.stabilityScore > 85 ? <span className="text-emerald-400">High</span> : sku.stabilityScore > 70 ? <span className="text-yellow-400">Med</span> : <span className="text-red-400">Low</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </FeaturePageShell>
  );
}
