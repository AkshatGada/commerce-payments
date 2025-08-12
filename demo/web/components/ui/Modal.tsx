import React from 'react';
import { cn } from './cn';

type Props = {
  open: boolean;
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
};

export function Modal({ open, onClose, className, children, title }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative bg-card rounded-lg shadow-lg border border-gray-200 w-full max-w-2xl p-4', className)}>
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        {children}
      </div>
    </div>
  );
} 