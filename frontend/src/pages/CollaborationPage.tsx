import { useState } from 'react';
import { useCollaboration, useCreateAnnotation, useCreateOverride, useCreateThread, useAddThreadMessage, useResolveThread, useApproveOverride } from '../lib/api-hooks';
import FeaturePageShell from '../components/FeaturePageShell';

export default function CollaborationPage() {
  const { data, loading, refetch } = useCollaboration();
  const createAnn = useCreateAnnotation();
  const createOvr = useCreateOverride();
  const createThr = useCreateThread();
  const addMsg = useAddThreadMessage();
  const resolveThr = useResolveThread();
  const approveOvr = useApproveOverride();
  const [tab, setTab] = useState<'annotations' | 'overrides' | 'threads'>('annotations');
  const [text, setText] = useState('');
  const [skuId, setSkuId] = useState('');
  const annotations = data?.annotations ?? [];
  const overrides = data?.overrides ?? [];
  const threads = data?.threads ?? [];
  return (
    <FeaturePageShell title="Collaboration Layer" description="Annotations, forecast overrides, and threaded discussions on demand plans">
      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4">Add Comment or Override</h3>
          <div className="flex gap-3 mb-3">
            <input value={skuId} onChange={e => setSkuId(e.target.value)} placeholder="SKU ID..." className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm w-32 placeholder-gray-500 focus:outline-none focus:border-orange-500" />
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Your comment..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { if (!skuId || !text) return; await createAnn.execute({ skuId, text }); setText(''); refetch(); }} disabled={createAnn.loading} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Add Comment</button>
            <button onClick={async () => { if (!skuId || !text) return; await createThr.execute({ skuId, subject: text.slice(0,40), text }); setText(''); refetch(); }} disabled={createThr.loading} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Start Thread</button>
          </div>
        </div>
        <div className="flex gap-2 border-b border-gray-700/50 pb-2">
          {(['annotations','overrides','threads'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:text-white'}`}>{t} <span className="ml-1 text-xs text-gray-500">{t === 'annotations' ? annotations.length : t === 'overrides' ? overrides.length : threads.length}</span></button>
          ))}
          {data && data.pendingApprovals > 0 && <div className="ml-auto text-xs text-red-400 self-center">{data.pendingApprovals} pending approvals</div>}
        </div>
        {tab === 'annotations' && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {annotations.length === 0 && <div className="text-gray-500 p-8 text-center">No annotations yet.</div>}
            {annotations.map(a => (
              <div key={a.id} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div><span className="text-white font-medium text-sm">{a.author}</span><span className="text-gray-500 text-xs ml-2">{a.role}</span><span className="text-gray-600 text-xs ml-2">· {new Date(a.createdAt).toLocaleString()}</span></div>
                  <span className={`text-xs px-2 py-0.5 rounded ${a.type === 'comment' ? 'bg-blue-500/20 text-blue-400' : a.type === 'override' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>{a.type}</span>
                </div>
                <p className="text-gray-300 text-sm">{a.text}</p>
                {a.skuId && <div className="text-xs text-gray-500 mt-1">SKU: {a.skuId} {a.week ? `· Week: ${a.week}` : ''}</div>}
              </div>
            ))}
          </div>
        )}
        {tab === 'overrides' && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {overrides.length === 0 && <div className="text-gray-500 p-8 text-center">No overrides yet.</div>}
            {overrides.map(o => (
              <div key={o.id} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-white font-medium text-sm">{o.author}</span><span className="text-gray-500 text-xs ml-2">· {o.reason}</span></div>
                  <div className="flex items-center gap-2">
                    {o.approved === null ? <span className="text-yellow-400 text-xs font-medium px-2 py-0.5 bg-yellow-500/10 rounded">Pending</span> : o.approved ? <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded">Approved</span> : <span className="text-red-400 text-xs font-medium px-2 py-0.5 bg-red-500/10 rounded">Rejected</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400 text-xs">Original P50</span><div className="text-gray-300">{o.originalP50.toFixed(1)}</div></div>
                  <div><span className="text-gray-400 text-xs">Adjusted P50</span><div className="text-orange-400 font-medium">{o.adjustedP50.toFixed(1)}</div></div>
                </div>
                {o.approved === null && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={async () => { await approveOvr.execute(o.id, true); refetch(); }} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded text-xs">Approve</button>
                    <button onClick={async () => { await approveOvr.execute(o.id, false); refetch(); }} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1 rounded text-xs">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === 'threads' && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {threads.length === 0 && <div className="text-gray-500 p-8 text-center">No discussion threads yet.</div>}
            {threads.map(t => (
              <div key={t.id} className="bg-[#1e293b] rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                  <div><h4 className="text-white font-medium text-sm">{t.subject}</h4><span className="text-gray-500 text-xs">SKU: {t.skuId} · {t.messages.length} messages</span></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{t.status}</span>
                    {t.status === 'open' && <button onClick={async () => { await resolveThr.execute(t.id); refetch(); }} className="text-xs text-gray-400 hover:text-emerald-400">Resolve</button>}
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                  {t.messages.map(m => (
                    <div key={m.id} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1"><span className="text-white text-xs font-medium">{m.author}</span><span className="text-gray-600 text-xs">{m.role}</span></div>
                      <p className="text-gray-300 text-sm">{m.text}</p>
                    </div>
                  ))}
                </div>
                {t.status === 'open' && (
                  <div className="px-4 pb-4 pt-2">
                    <div className="flex gap-2">
                      <input id={`msg-${t.id}`} placeholder="Type a reply..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none" onKeyDown={async (e) => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                          await addMsg.execute(t.id, { text: (e.target as HTMLInputElement).value });
                          (e.target as HTMLInputElement).value = '';
                          refetch();
                        }
                      }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FeaturePageShell>
  );
}
