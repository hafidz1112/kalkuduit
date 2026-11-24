import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getWeekOptionsList, WeekOption } from '../lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';

export const WeekFilter: React.FC = () => {
  const {
    selectedPeriod,
    currentWeekOffset,
    isCurrentWeek,
    selectWeekByOffset,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const weekOptions = getWeekOptionsList(8, 2);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find relative label for currently selected period
  const activeOption = weekOptions.find(
    (w) => w.offset === currentWeekOffset
  );

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Segmented Weekly Filter Bar */}
      <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs p-0.5">
        {/* Previous Week Button */}
        <button
          type="button"
          onClick={goToPreviousWeek}
          title="Pekan Sebelumnya"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Center Week Selector Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="max-w-[130px] sm:max-w-[170px] truncate">
            {selectedPeriod?.label || 'Pilih Pekan'}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Next Week Button */}
        <button
          type="button"
          onClick={goToNextWeek}
          title="Pekan Berikutnya"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-64 sm:w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Filter Pekan
            </span>

            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => {
                  goToCurrentWeek();
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:underline bg-slate-100 px-2 py-0.5 rounded-md"
              >
                <RotateCcw className="w-3 h-3" />
                Pekan Ini
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-slate-50">
            {weekOptions.map((opt) => {
              const isSelected = opt.offset === currentWeekOffset;

              return (
                <button
                  key={opt.offset}
                  type="button"
                  onClick={() => {
                    selectWeekByOffset(opt.offset);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white font-bold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold opacity-75">
                      {opt.relativeLabel}
                    </span>
                    <span className="text-xs">
                      {opt.label}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
