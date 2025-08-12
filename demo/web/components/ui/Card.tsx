import React from 'react';
import { cn } from './cn';

type Variant = 'default' | 'glass' | 'muted';

export function Card({ className, variant = 'default', ...rest }: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  const base = 'rounded-lg border p-4 shadow-sm';
  const variants: Record<Variant, string> = {
    default: 'bg-white border-gray-200 text-[#2C3E50]',
    glass: 'bg-white backdrop-blur border-white/60 shadow-md text-[#2C3E50]',
    muted: 'bg-[#F7F8FC] border-[#EAEBF0] shadow-sm text-[#2C3E50]',
  };
  return <div className={cn(base, variants[variant], className)} {...rest} />;
} 