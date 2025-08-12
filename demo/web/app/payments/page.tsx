'use client';

import { useState } from 'react';

type TxResp = {
  addresses: { escrow: string; preApprovalCollector?: string; token: string; operator?: string; payer: string; merchant: string; tokenStore: string };
  txs: { approveHash?: string; preApproveHash?: string; authorizeHash?: string; captureHash?: string; chargeHash?: string; refundHash?: string; voidHash?: string; reclaimHash?: string };
  balancesBefore: { payer: string; merchant: string; tokenStore: string };
  balancesAfter: { payer: string; merchant: string; tokenStore: string };
};

const scan = 'https://amoy.polygonscan.com/tx/';

export default function PaymentsDemo() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TxResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async (path: string) => {
    setLoading(true); setErr(null); setData(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setData(json);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2>Payments Visual Demo</h2>

      {/* Graph placeholder */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        <b>Graph</b>
        <div>Payer → TokenStore (operator) → Merchant (FeeReceiver when non-zero)</div>
        <div style={{ color: '#666' }}>(Animated graph to be added)</div>
      </div>

      {/* State panel placeholder */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        <b>State</b>
        <div>Capturable: [####.....] Refundable: [##.......]</div>
        <div>Expiries: preApproval, authorization, refund (countdowns)</div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={loading} onClick={() => run('/api/charge')}>Scene: Charge (1-step)</button>
        <button disabled={loading} onClick={() => run('/api/authorize-capture')}>Scene: Authorize → Capture</button>
        <button disabled={loading} onClick={() => run('/api/refund')}>Refund</button>
        <button disabled={loading} onClick={() => run('/api/void')}>Void</button>
        <button disabled={loading} onClick={() => run('/api/reclaim')}>Reclaim</button>
      </div>

      {err && <div style={{ color: 'red' }}>{err}</div>}

      {/* Balances */}
      {data && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <b>Balances</b>
            <pre style={{ background: '#f7f7f7', padding: 8 }}>
              {JSON.stringify({ before: data.balancesBefore, after: data.balancesAfter }, null, 2)}
            </pre>
          </div>

          {/* Timeline */}
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <b>Txs</b>
            <ul>
              {data.txs.approveHash && <li>approve: <a href={`${scan}${data.txs.approveHash}`} target="_blank">view</a></li>}
              {data.txs.preApproveHash && <li>preApprove: <a href={`${scan}${data.txs.preApproveHash}`} target="_blank">view</a></li>}
              {data.txs.authorizeHash && <li>authorize: <a href={`${scan}${data.txs.authorizeHash}`} target="_blank">view</a></li>}
              {data.txs.captureHash && <li>capture: <a href={`${scan}${data.txs.captureHash}`} target="_blank">view</a></li>}
              {data.txs.chargeHash && <li>charge: <a href={`${scan}${data.txs.chargeHash}`} target="_blank">view</a></li>}
              {data.txs.refundHash && <li>refund: <a href={`${scan}${data.txs.refundHash}`} target="_blank">view</a></li>}
              {data.txs.voidHash && <li>void: <a href={`${scan}${data.txs.voidHash}`} target="_blank">view</a></li>}
              {data.txs.reclaimHash && <li>reclaim: <a href={`${scan}${data.txs.reclaimHash}`} target="_blank">view</a></li>}
            </ul>
          </div>

          {/* Addresses */}
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <b>Addresses</b>
            <pre style={{ background: '#f7f7f7', padding: 8 }}>
              {JSON.stringify(data.addresses, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 