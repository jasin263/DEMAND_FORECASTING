'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SKUDetailModal from './SKUDetailModal';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { PackageSearch } from 'lucide-react';
import { useSKUs } from '@/lib/api-hooks';
import type { SKUItem } from '@/lib/api-types';

const PAGE_SIZE = 8;

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SKUDrilldownTable() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('mape');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedSku, setSelectedSku] = useState<SKUItem | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: response, loading, error, refetch } = useSKUs({ page, sort: sortField, order: sortDir, search: debouncedSearch || undefined });

  const items = response?.data ?? [];
  const totalPages = Math.max(Math.ceil((response?.total ?? 0) / PAGE_SIZE), 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-muted-foreground ml-1" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-primary ml-1" />
    ) : (
      <ArrowDown size={12} className="text-primary ml-1" />
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">SKU Forecast Detail</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {response ? `${response.total} SKUs` : 'Loading SKUs'} · sorted by {sortField} {sortDir}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SKUs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 py-1.5 text-xs h-8 w-56"
            />
          </div>
          <button className="btn-secondary text-xs py-1.5">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="table-header-cell">SKU ID</th>
              <th className="table-header-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                <span className="flex items-center">Name <SortIcon field="name" /></span>
              </th>
              <th className="table-header-cell">Category</th>
              <th className="table-header-cell">Location</th>
              <th className="table-header-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('mape')}>
                <span className="flex items-center">MAPE <SortIcon field="mape" /></span>
              </th>
              <th className="table-header-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('bias')}>
                <span className="flex items-center">Bias <SortIcon field="bias" /></span>
              </th>
              <th className="table-header-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('p50Forecast')}>
                <span className="flex items-center">P50 Forecast <SortIcon field="p50Forecast" /></span>
              </th>
              <th className="table-header-cell cursor-pointer hover:text-foreground" onClick={() => handleSort('reorderQty')}>
                <span className="flex items-center">Reorder Qty <SortIcon field="reorderQty" /></span>
              </th>
              <th className="table-header-cell">Model</th>
              <th className="table-header-cell">Pattern</th>
              <th className="table-header-cell">Trend</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRowSkeleton key={`skel-row-${i}`} cols={12} />
              ))
            ) : error ? (
              <tr>
                <td colSpan={12} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 py-8">
                    <AlertTriangle size={24} className="text-negative" />
                    <p className="text-sm text-negative font-medium">Failed to load SKUs</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                    <button onClick={refetch} className="btn-secondary text-xs py-1.5">Retry</button>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-8">
                  <EmptyState
                    icon={<PackageSearch size={24} />}
                    title="No SKUs match your search"
                    description="Try a different SKU ID, name, or category."
                  />
                </td>
              </tr>
            ) : (
              items.map((sku) => (
                <tr key={sku.id} className="table-row-hover">
                  <td className="table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{sku.skuId}</span>
                  </td>
                  <td className="table-cell max-w-[180px]">
                    <span className="truncate block font-medium">{sku.name}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs text-muted-foreground">{sku.category}</span>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{sku.location}</span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`font-tabular font-semibold text-sm ${
                        sku.mape > 25 ? 'text-negative' : sku.mape > 15 ? 'text-warning' : 'text-positive'
                      }`}
                    >
                      {sku.mape}%
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`font-tabular text-sm ${
                        Math.abs(sku.bias) > 5 ? 'text-negative' : Math.abs(sku.bias) > 2 ? 'text-warning' : 'text-muted-foreground'
                      }`}
                    >
                      {sku.bias > 0 ? '+' : ''}{sku.bias}%
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-tabular">{sku.p50Forecast.toLocaleString()}</span>
                  </td>
                  <td className="table-cell">
                    <span className="font-tabular font-medium">{sku.reorderQty.toLocaleString()}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{sku.model}</span>
                  </td>
                  <td className="table-cell">
                    <Badge variant={sku.pattern === 'Smooth' ? 'positive' : sku.pattern === 'Intermittent' || sku.pattern === 'Lumpy' ? 'warning' : sku.pattern === 'Seasonal' ? 'info' : 'neutral'}>
                      {sku.pattern}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <svg width={56} height={24} className="overflow-visible">
                      <polyline
                        points={sku.trend.map((v, i, arr) => {
                          const min = Math.min(...arr);
                          const max = Math.max(...arr);
                          const range = max - min || 1;
                          const x = (i / (arr.length - 1)) * 56;
                          const y = 24 - ((v - min) / range) * 24;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => setSelectedSku(sku)}
                      className="btn-ghost p-1.5"
                      title="View SKU detail"
                    >
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
          {response ? `Showing ${(response.page - 1) * response.pageSize + 1}–${Math.min(response.page * response.pageSize, response.total)} of ${response.total} SKUs` : 'Loading…'}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn-ghost p-1.5 disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={`page-${i + 1}`}
              onClick={() => setPage(i + 1)}
              disabled={loading}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                page === i + 1 ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="btn-ghost p-1.5 disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <Modal
        open={!!selectedSku}
        onClose={() => setSelectedSku(null)}
        title={selectedSku ? `${selectedSku.skuId} · ${selectedSku.name}` : ''}
        size="xl"
      >
        {selectedSku && <SKUDetailModal sku={selectedSku} />}
      </Modal>
    </div>
  );
}
