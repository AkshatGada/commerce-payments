import React from 'react';
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '../components/ui/Toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground font-sans">
        <ToastProvider>
          <div className="max-w-5xl mx-auto p-6">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
} 