import React from 'react';
import { FinancialHealthStatus } from '../types';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: FinancialHealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onDark?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  onDark = false,
}) => {
  const config = onDark
    ? {
        aman: {
          bg: 'bg-[#22533E] text-[#D7F0E0] border-[#336E54]',
          icon: ShieldCheck,
          label: 'Aman',
        },
        ketat: {
          bg: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
          icon: AlertTriangle,
          label: 'Ketat',
        },
        defisit: {
          bg: 'bg-rose-400/20 text-rose-200 border-rose-400/30',
          icon: AlertOctagon,
          label: 'Defisit',
        },
      }[status]
    : {
        aman: {
          bg: 'bg-[#E5F2E8] text-[#113829] border-[#C5DEC9]',
          icon: ShieldCheck,
          label: 'Aman',
        },
        ketat: {
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: AlertTriangle,
          label: 'Ketat',
        },
        defisit: {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: AlertOctagon,
          label: 'Defisit',
        },
      }[status];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses} transition-colors`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
