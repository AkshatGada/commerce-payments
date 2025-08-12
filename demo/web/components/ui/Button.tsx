import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'subtle' | 'danger' | 'ghost';

type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ className, variant = 'primary', size = 'md', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const sizes: Record<Size, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };
  const styles: Record<Variant, string> = {
    primary: 'bg-[#4A90E2] text-white hover:bg-[#3d7fcb] active:scale-95 shadow',
    subtle: 'bg-white text-[#2C3E50] border border-[#EAEBF0] hover:bg-[#F7F8FC]',
    danger: 'bg-[#E74C3C] text-white hover:bg-[#d44133] active:scale-95 shadow',
    ghost: 'bg-transparent text-[#2C3E50] hover:bg-[#F7F8FC] border border-transparent',
  };
  return <button className={cn(base, sizes[size], styles[variant], className)} {...rest} />;
} 