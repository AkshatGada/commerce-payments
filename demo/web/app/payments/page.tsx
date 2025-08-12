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
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">Payments Visual Demo</h2>

      {/* Graph */}
      <div className="card">
        <b className="block mb-2">Graph</b>
        <Graph animateKey={JSON.stringify(data?.txs || {})} />
      </div>

      {/* State */}
      <div className="card grid gap-2">
        <b>State</b>
        <div className="text-sm text-gray-600">Capturable and Refundable bars coming next.</div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={loading} onClick={() => run('/api/charge')}>Charge (1-step)</button>
        <button className="btn" disabled={loading} onClick={() => run('/api/authorize-capture')}>Authorize → Capture</button>
        <button className="btn" disabled={loading} onClick={() => run('/api/refund')}>Refund</button>
        <button className="btn" disabled={loading} onClick={() => run('/api/void')}>Void</button>
        <button className="btn" disabled={loading} onClick={() => run('/api/reclaim')}>Reclaim</button>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      {/* Balances */}
      {data && (
        <div className="grid gap-3">
          <div className="card">
            <b>Balances</b>
            <pre className="bg-gray-50 p-2 rounded mt-2">
              {JSON.stringify({ before: data.balancesBefore, after: data.balancesAfter }, null, 2)}
            </pre>
          </div>

          {/* Timeline */}
          <div className="card">
            <b>Txs</b>
            <ul className="list-disc ml-6 mt-2">
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

          {/* Addresses */}
          <div className="card">
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
    // reset
    path.style.strokeDashoffset = `${len}`;
    // animate
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = '0';
    });
  }, [animateKey]);

  return (
    <svg className="w-full h-48" viewBox="0 0 600 220">
      {/* Nodes */}
      <circle cx="80" cy="110" r="24" className="fill-white stroke-gray-300" />
      <text x="80" y="115" textAnchor="middle" className="text-xs">Payer</text>

      <circle cx="260" cy="110" r="24" className="fill-white stroke-gray-300" />
      <text x="260" y="115" textAnchor="middle" className="text-xs">TokenStore</text>

      <circle cx="440" cy="110" r="24" className="fill-white stroke-gray-300" />
      <text x="440" y="115" textAnchor="middle" className="text-xs">Merchant</text>

      {/* Flow path */}
      <path ref={pathRef} d="M 104 110 L 236 110 L 416 110" stroke="#0ea5e9" strokeWidth="4" fill="none" />
      {/* Moving dot */}
      <circle r="6" fill="#22c55e">
        <animateMotion dur="0.65s" repeatCount="1" path="M 104 110 L 236 110 L 416 110" />
      </circle>
    </svg>
  );
} 