import React from 'react';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[#EAEBF0]', className)} />;
} 