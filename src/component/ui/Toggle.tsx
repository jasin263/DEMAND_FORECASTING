'use client';

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative mt-0.5 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`toggle-track w-9 h-5 ${checked ? 'bg-primary' : 'bg-muted border border-border'}`}
        >
          <span
            className={`toggle-thumb left-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-foreground">{label}</p>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  );
}