import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
          {children}
        </div>
      </body>
    </html>
  );
} 