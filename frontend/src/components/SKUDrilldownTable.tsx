import React, { useEffect, useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, ChevronLeft, ChevronRight, PackageSearch, Loader2, AlertTriangle } from 'lucide-react';
import Badge from './ui/Badge';
import Modal from './ui/Modal';
import SKUDetailModal from './SKUDetailModal';
import { useSkus } from '../lib/api-hooks';
import type { SKUForecastItem } from '../lib/api-types';
import { buildWorkspaceSkuItems, readWorkspaceForecastRun } from '../lib/workspace-forecast';

type SortField = 'mape' | 'bias' | 'p50Forecast' | 'reorderQty' | 'name' | 'category';
type SortDir = 'asc' | 'desc';

const patternBadge = (p: string) => {
  if (p === 'Smooth') return <Badge variant="positive">{p}</Badge>;
  if (p === 'Intermittent') return <Badge variant="warning">{p}</Badge>;
  if (p === 'Lumpy' || p === 'Erratic') return <Badge variant="negative">{p}</Badge>;
  if (p === 'Seasonal') return <Badge variant="info">{p}</Badge>;
  return <Badge>{p}</Badge>;
};

const MiniSparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const PAGE_SIZE = 8;

export default function SKUDrilldownTable({ category, location }: { category?: string; location?: string }) {
  const { data: paginated, loading: apiLoading, error: apiError, refetch } = useSkus({ pageSize: 100, category: category || undefined, location: location || undefined });
  const [workspaceSkus, setWorkspaceSkus] = useState<SKUForecastItem[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('mape');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selectedSku, setSelectedSku] = useState<SKUForecastItem | null>(null);

  useEffect(() => {
    const run = readWorkspaceForecastRun();
    setWorkspaceSkus(buildWorkspaceSkuItems(run));
  }, []);

  const workspaceMode = workspaceSkus.length > 0;
  const loading = workspaceMode ? false : apiLoading;
  const error = workspaceMode ? null : apiError;
  const allSkus = workspaceMode ? workspaceSkus : (paginated?.items ?? []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allSkus.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.skuId.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [allSkus, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginatedResults = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-muted-foreground ml-1" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-primary ml-1" />
    ) : (
      <ArrowDown size={12} className="text-primary ml-1" />
    );
  };

  if (error) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
            <p className="text-sm text-negative font-medium">Failed to load SKU data</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">SKU Forecast Detail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? 'Loading...' : `${filtered.length} SKUs · ${category || 'all categories'} · ${location || 'all locations'} · sorted by ${sortField} ${sortDir}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SKUs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-8 py-1.5 text-xs h-8 w-56"
            />
          </div>
          <button className="btn-secondary text-xs py-1.5">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                    <span className="flex items-center">Name <SortIcon field="name" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('category')}>
                    <span className="flex items-center">Category <SortIcon field="category" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('mape')}>
                    <span className="flex items-center">MAPE <SortIcon field="mape" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('bias')}>
                    <span className="flex items-center">Bias <SortIcon field="bias" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('p50Forecast')}>
                    <span className="flex items-center">P50 Forecast <SortIcon field="p50Forecast" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('reorderQty')}>
                    <span className="flex items-center">Reorder Qty <SortIcon field="reorderQty" /></span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pattern</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trend</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <PackageSearch size={24} className="text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">No SKUs match your search</p>
                        <p className="text-xs text-muted-foreground">Try a different SKU ID, name, or category.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((sku) => (
                    <tr key={sku.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{sku.skuId}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="truncate block font-medium">{sku.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{sku.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{sku.location}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-tabular font-semibold text-sm ${
                          sku.mape > 25 ? 'text-negative' : sku.mape > 15 ? 'text-warning' : 'text-positive'
                        }`}>
                          {sku.mape}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-tabular text-sm ${
                          Math.abs(sku.bias) > 5 ? 'text-negative' : Math.abs(sku.bias) > 2 ? 'text-warning' : 'text-muted-foreground'
                        }`}>
                          {sku.bias > 0 ? '+' : ''}{sku.bias}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-tabular">{sku.p50Forecast.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-tabular font-medium">{sku.reorderQty.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{sku.model}</span>
                      </td>
                      <td className="px-4 py-3">{patternBadge(sku.pattern)}</td>
                      <td className="px-4 py-3">
                        <MiniSparkline data={sku.trend} />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedSku(sku)} className="btn-ghost p-1.5" title="View SKU detail">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {sorted.length > 0
                ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} SKUs`
                : 'No results'}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={`page-${i + 1}`} onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    page === i + 1 ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost p-1.5 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <Modal open={!!selectedSku} onClose={() => setSelectedSku(null)} title={selectedSku ? `${selectedSku.skuId} · ${selectedSku.name}` : ''}>
        {selectedSku && <SKUDetailModal skuId={selectedSku.id} />}
      </Modal>
    </div>
  );
}
