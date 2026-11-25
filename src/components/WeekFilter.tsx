import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getCurrentWeekPeriod, getCurrentMonthPeriod } from '../lib/utils';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';

interface WeekFilterProps {
  compact?: boolean;
}

export const WeekFilter: React.FC<WeekFilterProps> = ({ compact = false }) => {
  const {
    selectedPeriod,
    periodMode,
    isCurrentPeriod,
    switchPeriodMode,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentWeek = getCurrentWeekPeriod();
  const currentMonth = getCurrentMonthPeriod();

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <div className="flex items-center rounded-full border border-[#E6E5DD] bg-white shadow-2xs p-0.5">
        {!compact && (
          <button
            type="button"
            onClick={goToPreviousPeriod}
            title={periodMode === 'monthly' ? 'Bulan Sebelumnya' : 'Pekan Sebelumnya'}
            className="p-1.5 rounded-full text-[#6D7772] hover:text-[#113829] hover:bg-[#EFEFE8] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#14221C] hover:bg-[#FAF8F5] rounded-full transition-colors"
        >
          {periodMode === 'monthly' ? (
            <CalendarDays className="w-3.5 h-3.5 text-[#113829] shrink-0" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-[#113829] shrink-0" />
          )}
          <span className="max-w-[118px] truncate">
            {selectedPeriod?.label || (periodMode === 'monthly' ? currentMonth.label : currentWeek.label)}
          </span>
          <ChevronDown className={`w-3 h-3 text-[#6D7772] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {!compact && (
          <button
            type="button"
            onClick={goToNextPeriod}
            title={periodMode === 'monthly' ? 'Bulan Berikutnya' : 'Pekan Berikutnya'}
            className="p-1.5 rounded-full text-[#6D7772] hover:text-[#113829] hover:bg-[#EFEFE8] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-64 rounded-2xl bg-white border border-[#E6E5DD] shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="p-3 border-b border-[#EFEFE8] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6D7772] uppercase tracking-wider">
              Filter Periode
            </span>

            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={() => {
                  goToCurrentPeriod();
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#113829] hover:underline bg-[#EFEFE8] px-2 py-0.5 rounded-full"
              >
                <RotateCcw className="w-3 h-3" />
                {periodMode === 'monthly' ? 'Bulan Ini' : 'Pekan Ini'}
              </button>
            )}
          </div>

          <div className="p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => {
                switchPeriodMode('weekly');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                periodMode === 'weekly'
                  ? 'bg-[#113829] text-white font-bold'
                  : 'hover:bg-[#FAF8F5] text-[#14221C]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${periodMode === 'weekly' ? 'text-[#B8DEC4]' : 'text-[#6D7772]'}`} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Per Minggu</span>
                  <span className={`text-[11px] ${periodMode === 'weekly' ? 'text-[#B8DEC4] font-normal' : 'text-[#6D7772]'}`}>
                    Hitung mingguan ({currentWeek.label})
                  </span>
                </div>
              </div>
              {periodMode === 'weekly' && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
            </button>

            <button
              type="button"
              onClick={() => {
                switchPeriodMode('monthly');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                periodMode === 'monthly'
                  ? 'bg-[#113829] text-white font-bold'
                  : 'hover:bg-[#FAF8F5] text-[#14221C]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <CalendarDays className={`w-4 h-4 mt-0.5 shrink-0 ${periodMode === 'monthly' ? 'text-[#B8DEC4]' : 'text-[#6D7772]'}`} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Per Bulan</span>
                  <span className={`text-[11px] ${periodMode === 'monthly' ? 'text-[#B8DEC4] font-normal' : 'text-[#6D7772]'}`}>
                    Hitung bulanan ({currentMonth.label})
                  </span>
                </div>
              </div>
              {periodMode === 'monthly' && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
