'use client';

import { useState } from 'react';

const amoyScan = 'https://amoy.polygonscan.com/tx/';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setErr(null); setData(null);
    try {
      const res = await fetch('/api/run-demo', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setData(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h2>Amoy One‑Click Demo</h2>
      <p>Approve → PreApprove → Authorize → Capture (fee = 0)</p>
      <button onClick={run} disabled={loading} style={{ padding: '10px 16px' }}>
        {loading ? 'Running…' : 'Run demo'}
      </button>
      {err && <p style={{ color: 'red' }}>{err}</p>}
      {data && (
        <div style={{ marginTop: 16 }}>
          <h3>Transactions</h3>
          <ul>
            <li>approve: <a href={`${amoyScan}${data.txs.approveHash}`} target="_blank">view</a></li>
            <li>preApprove: <a href={`${amoyScan}${data.txs.preApproveHash}`} target="_blank">view</a></li>
            <li>authorize: <a href={`${amoyScan}${data.txs.authorizeHash}`} target="_blank">view</a></li>
            <li>capture: <a href={`${amoyScan}${data.txs.captureHash}`} target="_blank">view</a></li>
          </ul>
          <h3>Balances</h3>
          <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 8 }}>
            {JSON.stringify({ before: data.balancesBefore, after: data.balancesAfter }, null, 2)}
          </pre>
          <h3>Addresses</h3>
          <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(data.addresses, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
} 