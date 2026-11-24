import React from 'react';
import { FinancialHealthStatus } from '../types';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: FinancialHealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = {
    aman: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      label: 'Aman',
    },
    ketat: {
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      label: 'Ketat',
    },
    defisit: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: AlertOctagon,
      iconColor: 'text-rose-600',
      label: 'Defisit',
    },
  }[status];

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-lg border ${config.bg} ${sizeClasses} transition-colors`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
