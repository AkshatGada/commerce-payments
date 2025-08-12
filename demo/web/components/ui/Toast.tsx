'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { cn } from './cn';

type Toast = { id: number; kind?: 'success' | 'error' | 'info'; message: string };

type Ctx = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push: Ctx['push'] = (t) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => remove(id), 4500);
  };
  const remove: Ctx['remove'] = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));
  const value = useMemo(() => ({ toasts, push, remove }), [toasts]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={cn('px-4 py-2 rounded shadow text-sm',
            t.kind === 'success' && 'bg-green-600 text-white',
            t.kind === 'error' && 'bg-red-600 text-white',
            (!t.kind || t.kind === 'info') && 'bg-sky-600 text-white'
          )}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
} 