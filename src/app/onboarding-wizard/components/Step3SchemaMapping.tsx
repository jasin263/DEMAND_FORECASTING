'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { WizardState } from './OnboardingWizardClient';

interface Step3Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface CanonicalField {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
  type: 'string' | 'date' | 'number' | 'boolean';
}

const canonicalSchema: CanonicalField[] = [
  { key: 'sku_id', label: 'SKU ID', required: true, description: 'Unique product identifier — used as the primary forecast key', example: 'NES-BEV-0421', type: 'string' },
  { key: 'location_id', label: 'Location / Warehouse', required: true, description: 'Store, warehouse, or distribution center identifier', example: 'WH-Mumbai-01', type: 'string' },
  { key: 'date', label: 'Date', required: true, description: 'Transaction or period date — daily, weekly, or monthly', example: '2026-07-01', type: 'date' },
  { key: 'quantity', label: 'Quantity Sold / Demand', required: true, description: 'Units sold or consumed in the period. Zero is valid for intermittent demand.', example: '142', type: 'number' },
  { key: 'price', label: 'Unit Price', required: false, description: 'Selling price per unit — used as a regressor in ML models', example: '220.00', type: 'number' },
  { key: 'promo_flag', label: 'Promotion Flag', required: false, description: 'Binary indicator — 1 if a promotion was active, 0 otherwise', example: '0 or 1', type: 'boolean' },
  { key: 'category', label: 'Product Category', required: false, description: 'Category or product family — used for hierarchical aggregation', example: 'Beverages', type: 'string' },
  { key: 'brand', label: 'Brand', required: false, description: 'Brand name — used for hierarchy and grouping', example: 'Nescafé', type: 'string' },
  { key: 'lead_time_days', label: 'Lead Time (days)', required: false, description: 'Supplier lead time for this SKU — used in reorder point calculation', example: '14', type: 'number' },
  { key: 'moq', label: 'Minimum Order Qty', required: false, description: 'Minimum order quantity — constrains reorder recommendations', example: '100', type: 'number' },
];

const detectedColumns = [
  'sku_code', 'store_id', 'txn_date', 'qty_sold', 'unit_price', 'promo', 'product_category', 'brand_name', '', '',
];

const autoSuggest: Record<string, string> = {
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

export default function Step3SchemaMapping({ state, onUpdate, onNext, onBack }: Step3Props) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    if (Object.keys(state.columnMappings).length > 0) return state.columnMappings;
    return autoSuggest;
  });

  const setMapping = (canonicalKey: string, rawCol: string) => {
    setMappings((prev) => ({ ...prev, [canonicalKey]: rawCol }));
  };

  const requiredMapped = canonicalSchema
    .filter((f) => f.required)
    .every((f) => mappings[f.key] && mappings[f.key] !== '');

  const mappedCount = Object.values(mappings).filter(Boolean).length;

  const handleNext = () => {
    onUpdate({ columnMappings: mappings });
    onNext();
  };

  const availableColumns = ['', ...detectedColumns.filter(Boolean)];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-foreground">Map your columns to the platform schema</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Match your raw column headers to ForecastIQ's canonical fields. Required fields must be mapped before you can proceed. Optional fields improve forecast accuracy.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className="text-xs text-muted-foreground">{mappedCount}/{canonicalSchema.length} mapped</span>
            {requiredMapped && (
              <span className="status-badge bg-positive/10 text-positive border border-positive/20">
                <CheckCircle size={11} />
                Required fields mapped
              </span>
            )}
          </div>
        </div>

        {/* Auto-detect notice */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-5 text-xs">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="text-primary font-medium">Auto-detected:</span> ForecastIQ matched {Object.values(autoSuggest).filter(Boolean).length} of {canonicalSchema.length} columns automatically based on column name similarity. Review and adjust as needed.
          </p>
        </div>

        {/* Mapping table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-cell">Platform Field</th>
                <th className="table-header-cell">Required</th>
                <th className="table-header-cell">Your Column</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Example Value</th>
                <th className="table-header-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {canonicalSchema.map((field) => {
                const mapped = mappings[field.key];
                const isMapped = !!mapped;
                const isAutoSuggested = autoSuggest[field.key] === mapped && !!mapped;

                return (
                  <tr key={`map-${field.key}`} className="table-row-hover">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-sm text-foreground">{field.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{field.description}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      {field.required ? (
                        <Badge variant="negative">Required</Badge>
                      ) : (
                        <Badge variant="neutral">Optional</Badge>
                      )}
                    </td>
                    <td className="table-cell">
                      <select
                        value={mapped || ''}
                        onChange={(e) => setMapping(field.key, e.target.value)}
                        className={`input-field text-xs py-1.5 w-40 ${
                          isMapped ? 'border-positive/40 text-foreground' : field.required ? 'border-negative/40' : ''
                        }`}
                      >
                        <option value="">— not mapped —</option>
                        {detectedColumns.filter(Boolean).map((col) => (
                          <option key={`opt-${field.key}-${col}`} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {field.type}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{field.example}</span>
                    </td>
                    <td className="table-cell">
                      {isMapped ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-positive" />
                          {isAutoSuggested && (
                            <span className="text-xs text-muted-foreground">Auto</span>
                          )}
                        </div>
                      ) : field.required ? (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-negative" />
                          <span className="text-xs text-negative">Unmapped</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation summary */}
      {!requiredMapped && (
        <div className="flex items-start gap-2 p-3 bg-negative/5 border border-negative/20 rounded-lg text-xs animate-slide-up">
          <AlertCircle size={14} className="text-negative shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="text-negative font-medium">Required fields missing:</span>{' '}
            {canonicalSchema
              .filter((f) => f.required && !mappings[f.key])
              .map((f) => f.label)
              .join(', ')}{' '}
            must be mapped before proceeding.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!requiredMapped}
          className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Configuration
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}