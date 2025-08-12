import React from 'react';
import { cn } from './cn';

type Variant = 'neutral' | 'success' | 'warning' | 'info';

export function Badge({ className, variant = 'neutral', children }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    neutral: 'bg-[#F1F5F9] text-[#2C3E50]',
    success: 'bg-[#E8F8EE] text-[#2ECC71]',
    warning: 'bg-[#FFF4E5] text-[#F39C12]',
    info: 'bg-[#E7F2FD] text-[#4A90E2]',
  };
  return <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', styles[variant], className)}>{children}</span>;
} 