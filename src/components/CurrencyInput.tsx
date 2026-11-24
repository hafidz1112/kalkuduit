import React from 'react';
import { formatIDR, parseIDRInput } from '../lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  showQuickChips?: boolean;
  className?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  label,
  helperText,
  error,
  showQuickChips = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawNum = parseIDRInput(e.target.value);
    onChange(rawNum);
  };

  const handleAddChip = (amountToAdd: number) => {
    onChange((value || 0) + amountToAdd);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <span className="text-sm font-bold text-slate-400">Rp</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={value ? new Intl.NumberFormat('id-ID').format(value) : ''}
          onChange={handleChange}
          placeholder={placeholder}
          className={`block w-full rounded-xl border bg-white py-2.5 pl-11 pr-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200'
          }`}
        />
      </div>

      {showQuickChips && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[10000, 20000, 50000, 100000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleAddChip(amt)}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 transition-colors border border-slate-200/60"
            >
              +{formatIDR(amt).replace('Rp ', '')}
            </button>
          ))}
          <button
            key="reset"
            type="button"
            onClick={() => onChange(0)}
            className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
