'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, ChevronRight, ChevronLeft, Database } from 'lucide-react';
import type { WizardState } from './OnboardingWizardClient';

interface Step2Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Pre-populated column mappings for sample data (matches the preview headers)
const sampleColumnMappings: Record<string, string> = {
  sku_id: 'sku_code',
  location_id: 'store_id',
  date: 'txn_date',
  quantity: 'qty_sold',
  price: 'unit_price',
  promo_flag: 'promo',
  category: 'product_category',
  brand: 'brand_name',
  lead_time_days: '',
  moq: '',
};

// Mock preview data
const previewRows = [
  { sku_code: 'NES-001', store_id: 'STR-MUM-01', txn_date: '2026-07-01', qty_sold: 142, unit_price: 220.0, promo: 0 },
  { sku_code: 'NES-002', store_id: 'STR-MUM-01', txn_date: '2026-07-01', qty_sold: 87, unit_price: 45.5, promo: 1 },
  { sku_code: 'NES-003', store_id: 'STR-DEL-02', txn_date: '2026-07-01', qty_sold: 203, unit_price: 18.0, promo: 0 },
  { sku_code: 'NES-001', store_id: 'STR-DEL-02', txn_date: '2026-07-02', qty_sold: 156, unit_price: 220.0, promo: 0 },
  { sku_code: 'NES-004', store_id: 'STR-BLR-03', txn_date: '2026-07-02', qty_sold: 0, unit_price: 95.0, promo: 0 },
  { sku_code: 'NES-005', store_id: 'STR-BLR-03', txn_date: '2026-07-02', qty_sold: 318, unit_price: 12.5, promo: 1 },
  { sku_code: 'NES-002', store_id: 'STR-CHN-04', txn_date: '2026-07-03', qty_sold: 74, unit_price: 45.5, promo: 0 },
  { sku_code: 'NES-006', store_id: 'STR-CHN-04', txn_date: '2026-07-03', qty_sold: 0, unit_price: 340.0, promo: 0 },
];

const previewHeaders = ['sku_code', 'store_id', 'txn_date', 'qty_sold', 'unit_price', 'promo'];

type ConnectMode = 'upload' | 'sample';

export default function Step2DataUpload({ state, onUpdate, onNext, onBack }: Step2Props) {
  const [dragOver, setDragOver] = useState(false);
  const [connectMode, setConnectMode] = useState<ConnectMode>('upload');
  const [showPreview, setShowPreview] = useState(!!state.uploadedFile);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    onUpdate({ uploadedFile: file });
    setShowPreview(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUseSample = () => {
    setShowPreview(true);
    const blob = new Blob(['mock'], { type: 'text/csv' });
    const mockFile = new File([blob], 'sample_fmcg_demand.csv', { type: 'text/csv' });
    onUpdate({ uploadedFile: mockFile, columnMappings: { ...sampleColumnMappings } });
  };

  const canProceed = showPreview;

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">Connect your demand data</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Upload a CSV or Excel file containing your historical demand records. Each row should represent one SKU × Location × Date observation.
        </p>

        <div className="flex gap-2 mb-5 bg-muted rounded-lg p-1 w-fit">
          {[
            { id: 'upload' as ConnectMode, label: 'Upload File', icon: <Upload size={14} /> },
            { id: 'sample' as ConnectMode, label: 'Use Sample Data', icon: <Database size={14} /> },
          ].map((tab) => (
            <button
              key={`mode-${tab.id}`}
              type="button"
              onClick={() => setConnectMode(tab.id)}
              className={connectMode === tab.id ? 'tab-btn-active text-xs py-1.5 px-3 flex items-center gap-1.5' : 'tab-btn text-xs py-1.5 px-3 flex items-center gap-1.5'}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {connectMode === 'upload' && (
          <div>
            {!state.uploadedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150 ${
                  dragOver
                    ? 'border-primary bg-primary/8' :'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Upload size={22} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Drop your file here, or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.csv, .xlsx) · Max 50MB · UTF-8 encoded</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Expected columns: SKU ID, Location, Date, Quantity</span>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-positive/5 border border-positive/20 rounded-xl">
                <CheckCircle size={18} className="text-positive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{state.uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(state.uploadedFile.size / 1024).toFixed(1)} KB · Parsed successfully · 8 columns detected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { onUpdate({ uploadedFile: null }); setShowPreview(false); }}
                  className="btn-ghost p-1.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {connectMode === 'sample' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use pre-generated synthetic demand data for the <strong className="text-foreground">FMCG demo tenant</strong> — 342 SKUs across 4 warehouses, 24 months of weekly history with promotional spikes and seasonal patterns.
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { label: 'SKUs', value: '342' },
                { label: 'Locations', value: '4 warehouses' },
                { label: 'Date range', value: 'Jul 2024 – Jul 2026' },
                { label: 'Granularity', value: 'Weekly' },
                { label: 'Records', value: '~35,600 rows' },
                { label: 'Missing rate', value: '2.3%' },
              ].map((item) => (
                <div key={`sample-${item.label}`} className="bg-muted rounded-lg p-2.5">
                  <p className="text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {!showPreview ? (
              <button type="button" onClick={handleUseSample} className="btn-primary text-sm">
                <Database size={15} />
                Load Sample FMCG Dataset
              </button>
            ) : (
              <div className="flex items-center gap-2 text-positive text-sm">
                <CheckCircle size={16} />
                <span>Sample dataset loaded — 35,612 rows ready</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data preview */}
      {showPreview && (
        <div className="glass-card overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Data Preview</h3>
              <span className="text-xs text-muted-foreground">First 8 rows · {previewHeaders.length} columns detected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge bg-positive/10 text-positive border border-positive/20">
                <CheckCircle size={11} />
                Valid format
              </span>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {previewHeaders.map((h) => (
                    <th key={`ph-${h}`} className="table-header-cell">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={`preview-row-${i}`} className="table-row-hover">
                    <td className="table-cell font-mono text-accent">{row.sku_code}</td>
                    <td className="table-cell font-mono">{row.store_id}</td>
                    <td className="table-cell font-tabular">{row.txn_date}</td>
                    <td className="table-cell font-tabular">{row.qty_sold === 0 ? <span className="text-muted-foreground">0</span> : row.qty_sold}</td>
                    <td className="table-cell font-tabular">₹{row.unit_price.toFixed(2)}</td>
                    <td className="table-cell">
                      {row.promo === 1 ? (
                        <span className="status-badge bg-primary/10 text-primary border border-primary/20">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Columns auto-detected · Next step: map these columns to the platform schema
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Schema Mapping
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}