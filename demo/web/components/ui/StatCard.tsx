import React from 'react';
import { cn } from './cn';

export function StatCard({ title, value, sub, delta, children, icon, color, subtitle }: { title: string; value: React.ReactNode; sub?: React.ReactNode; delta?: string; children?: React.ReactNode; icon?: React.ReactNode; color?: string; subtitle?: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-[#EAEBF0] p-4 shadow-sm bg-white')}> 
      <div className="text-xs text-[#6B7280] flex items-center justify-between">
        <span className="flex items-center gap-1">
          {icon && <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded', color)}>{icon}</span>}
          <span>{title}</span>
        </span>
        {delta && <span className="text-[#2ECC71]">{delta}</span>}
      </div>
      <div className="text-2xl font-semibold mt-1 text-[#2C3E50]">{value}</div>
      {subtitle && <div className="text-xs text-[#6B7280]">{subtitle}</div>}
      {sub && <div className="text-xs text-[#6B7280]">{sub}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
} 