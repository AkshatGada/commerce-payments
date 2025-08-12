'use client';

import { useEffect, useRef, useState } from 'react';

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
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Payments Visual Demo</h2>
      </div>

      {/* Graph */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <b className="text-lg">Flow</b>
        </div>
        <Graph animateKey={JSON.stringify(data?.txs || {})} />
      </div>

      {/* Controls */}
      <div className="card">
        <div className="mb-3 font-semibold">Actions</div>
        <div className="flex flex-wrap gap-3">
          <button className="btn" disabled={loading} onClick={() => run('/api/charge')}>Charge (1-step)</button>
          <button className="btn" disabled={loading} onClick={() => run('/api/authorize-capture')}>Authorize → Capture</button>
          <button className="btn" disabled={loading} onClick={() => run('/api/refund')}>Refund</button>
          <button className="btn" disabled={loading} onClick={() => run('/api/void')}>Void</button>
          <button className="btn" disabled={loading} onClick={() => run('/api/reclaim')}>Reclaim</button>
        </div>
        {err && <div className="text-red-600 mt-3">{err}</div>}
      </div>

      {/* Details */}
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <b>Balances</b>
            <pre className="bg-gray-50 p-2 rounded mt-2">
              {JSON.stringify({ before: data.balancesBefore, after: data.balancesAfter }, null, 2)}
            </pre>
          </div>
          <div className="card">
            <b>Transactions</b>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              {data.txs.approveHash && <li>approve: <a className="text-primary underline" href={`${scan}${data.txs.approveHash}`} target="_blank">view</a></li>}
              {data.txs.preApproveHash && <li>preApprove: <a className="text-primary underline" href={`${scan}${data.txs.preApproveHash}`} target="_blank">view</a></li>}
              {data.txs.authorizeHash && <li>authorize: <a className="text-primary underline" href={`${scan}${data.txs.authorizeHash}`} target="_blank">view</a></li>}
              {data.txs.captureHash && <li>capture: <a className="text-primary underline" href={`${scan}${data.txs.captureHash}`} target="_blank">view</a></li>}
              {data.txs.chargeHash && <li>charge: <a className="text-primary underline" href={`${scan}${data.txs.chargeHash}`} target="_blank">view</a></li>}
              {data.txs.refundHash && <li>refund: <a className="text-primary underline" href={`${scan}${data.txs.refundHash}`} target="_blank">view</a></li>}
              {data.txs.voidHash && <li>void: <a className="text-primary underline" href={`${scan}${data.txs.voidHash}`} target="_blank">view</a></li>}
              {data.txs.reclaimHash && <li>reclaim: <a className="text-primary underline" href={`${scan}${data.txs.reclaimHash}`} target="_blank">view</a></li>}
            </ul>
          </div>
          <div className="card md:col-span-2">
            <b>Addresses</b>
            <pre className="bg-gray-50 p-2 rounded mt-2">
              {JSON.stringify(data.addresses, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Graph({ animateKey }: { animateKey: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (!pathRef.current) return;
    const path = pathRef.current;
    path.style.transition = 'stroke-dashoffset 650ms ease';
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  }, [animateKey]);

  return (
    <svg className="w-full h-56" viewBox="0 0 700 240">
      <circle cx="80" cy="120" r="28" className="fill-white stroke-gray-300" />
      <text x="80" y="125" textAnchor="middle" className="text-xs">Payer</text>

      <circle cx="320" cy="120" r="28" className="fill-white stroke-gray-300" />
      <text x="320" y="125" textAnchor="middle" className="text-xs">TokenStore</text>

      <circle cx="560" cy="120" r="28" className="fill-white stroke-gray-300" />
      <text x="560" y="125" textAnchor="middle" className="text-xs">Merchant</text>

      <path ref={pathRef} d="M 108 120 L 292 120 L 532 120" stroke="#0ea5e9" strokeWidth="5" fill="none" />
      <circle r="6" fill="#22c55e">
        <animateMotion dur="0.65s" repeatCount="1" path="M 108 120 L 292 120 L 532 120" />
      </circle>
    </svg>
  );
} 