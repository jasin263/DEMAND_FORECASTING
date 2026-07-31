import { useState } from 'react';
import { useSimulations, useCreateSimulation, useDeleteSimulation } from '../lib/api-hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import FeaturePageShell from '../components/FeaturePageShell';

const PRESET_COLORS: Record<string, string> = { 'promo-lift-20': '#f97316', 'price-cut-15': '#3b82f6', 'supply-disruption': '#ef4444', 'aggressive-growth': '#10b981' };

export default function SimulationsPage() {
  const { data, refetch } = useSimulations();
  const createSim = useCreateSimulation();
  const deleteSim = useDeleteSimulation();
  const [name, setName] = useState('');
  const [presetId, setPresetId] = useState('');
  const sims = data?.simulations ?? [];
  const presets = data?.presets ?? [];
  const params = data?.availableParams ?? [];
  return (
    <FeaturePageShell title="What-If Simulation Engine" description="Model demand scenarios with adjusted promo, price, and supply parameters">
      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4">Run a Simulation</h3>
          <div className="flex gap-3 mb-4">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Simulation name..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(p => (
              <button key={p.id} onClick={() => { setPresetId(p.id); setName(p.name); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${presetId === p.id ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>{p.name}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { if (!name) return; const p = presets.find(x => x.id === presetId); await createSim.execute({ name, parameters: p?.parameters ?? {} }); setName(''); setPresetId(''); refetch(); }} disabled={createSim.loading} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">{createSim.loading ? 'Running...' : 'Run Simulation'}</button>
          </div>
        </div>
        {sims.length === 0 && <div className="text-gray-500 p-8 text-center">No simulations yet. Create one above.</div>}
        {sims.map(sim => (
          <div key={sim.id} className="bg-[#1e293b] rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <div><h3 className="text-white font-semibold">{sim.name}</h3><span className="text-xs text-gray-500">{sim.created}</span></div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-lg text-xs font-medium ${sim.impact.impactPct > 10 ? 'bg-emerald-500/20 text-emerald-400' : sim.impact.impactPct < -5 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{sim.impact.impactPct > 0 ? '+' : ''}{sim.impact.impactPct}% impact</div>
                <button onClick={async () => { await deleteSim.execute(sim.id); refetch(); }} className="text-gray-500 hover:text-red-400 text-xs">Delete</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 p-4">
              <div><span className="text-gray-400 text-xs">Baseline</span><div className="text-white font-bold">{sim.impact.totalBaseline.toLocaleString()}</div></div>
              <div><span className="text-gray-400 text-xs">Simulated</span><div className="text-white font-bold">{sim.impact.totalSimulated.toLocaleString()}</div></div>
              <div><span className="text-gray-400 text-xs">SKUs</span><div className="text-white font-bold">{sim.impact.skuCount}</div></div>
              <div><span className="text-gray-400 text-xs">Delta</span><div className={`font-bold ${sim.impact.impactPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{sim.impact.impactPct > 0 ? '+' : ''}{sim.impact.impactPct}%</div></div>
            </div>
            <div className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={sim.series.filter((_,i) => i % 2 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="week" tick={{fill:'#94a3b8',fontSize:10}} />
                  <YAxis tick={{fill:'#94a3b8'}} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} />
                  <Legend />
                  <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#64748b" fill="#64748b" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="simulated" name="Simulated" stroke="#f97316" fill="#f97316" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </FeaturePageShell>
  );
}
