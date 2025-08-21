'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { motion } from 'framer-motion';

function formatAmount(raw: string, decimals = 18, symbol = '') {
  try { const n = BigInt(raw); const d = BigInt(10) ** BigInt(decimals); const whole = Number(n / d); const frac = Number(n % d) / Number(d); return `${(whole + frac).toLocaleString(undefined, { maximumFractionDigits: 4 })}${symbol ? ' ' + symbol : ''}`; } catch { return raw; }
}

function toUnits(amountDec: string, decimals = 18) {
  const [w, f = ''] = amountDec.split('.');
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals);
  return (BigInt(w || '0') * (BigInt(10) ** BigInt(decimals)) + BigInt(frac || '0')).toString();
}

function formatCountdown(unixSec?: number) {
  if (!unixSec) return '';
  const now = Date.now() / 1000;
  let s = Math.max(0, Math.floor(unixSec - now));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function useKpis() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/kpis');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'failed');
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return { data, loading, error, refresh };
}

const scanBase = 'https://amoy.polygonscan.com';

type PaymentRow = {
  paymentInfoHash: string;
  salt?: string;
  payer?: string;
  receiver?: string;
  token?: string;
  status?: string;
  statusColor?: string;
  preApprovalExpiry?: number;
  authorizationExpiry?: number;
  refundExpiry?: number;
};

type PaymentDetail = {
  paymentInfoHash: string;
  paymentInfo: {
    operator: string;
    payer: string;
    receiver: string;
    token: string;
    maxAmount: string;
    preApprovalExpiry: number;
    authorizationExpiry: number;
    refundExpiry: number;
    minFeeBps: number;
    maxFeeBps: number;
    feeReceiver: string;
    salt: string;
  } | null;
  state: { hasCollectedPayment: boolean; capturableAmount: string; refundableAmount: string };
  timeline: { type: string; blockNumber: bigint; data: any; txHash?: string }[];
};

type OpsLog = { op: string; txHash: string; url: string; meta?: Record<string, any> };

export default function Dashboard() {
  const [tab, setTab] = useState<'payments' | 'refunds' | 'disputes' | 'ops'>('payments');

  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const { data: kpis, refresh: refreshKpis } = useKpis();

  // Refunds tab state
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundables, setRefundables] = useState<any[]>([]);
  const refreshRefundables = async () => {
    try {
      setRefundsLoading(true);
      const res = await fetch('/api/dashboard/refunds');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'failed');
      setRefundables(json.items || []);
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setRefundsLoading(false); }
  };

  useEffect(() => { if (tab === 'refunds') refreshRefundables(); }, [tab]);

  // Detail drawer state
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Dispute modal state (detail view from disputes list)
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeDetail, setDisputeDetail] = useState<PaymentDetail | null>(null);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [newStatus, setNewStatus] = useState<'open' | 'pending' | 'resolved' | ''>('');
  const [approvingRefund, setApprovingRefund] = useState(false);
  const [approveAmountDec, setApproveAmountDec] = useState('');

  // Dispute creation from Payment detail
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [creatingDispute, setCreatingDispute] = useState(false);

  // Create dispute from Disputes tab
  const [newDisputeHash, setNewDisputeHash] = useState('');
  const [newDisputeReason, setNewDisputeReason] = useState('');
  const [newDisputeNotes, setNewDisputeNotes] = useState('');

  // Ops tab state
  const [opsAmountDec, setOpsAmountDec] = useState('0.1');
  const [opsPaymentInfo, setOpsPaymentInfo] = useState<any | null>(null);
  const [opsLogs, setOpsLogs] = useState<OpsLog[]>([]);
  const appendLog = (l: OpsLog) => setOpsLogs((prev) => [l, ...prev].slice(0, 50));

  const [loadingBuild, setLoadingBuild] = useState(false);
  const [loadingCharge, setLoadingCharge] = useState(false);
  const [loadingAuthCap, setLoadingAuthCap] = useState(false);
  const [loadingRefund, setLoadingRefund] = useState(false);
  const [loadingVoid, setLoadingVoid] = useState(false);
  const [loadingReclaim, setLoadingReclaim] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [pRes, dRes] = await Promise.all([
          fetch('/api/dashboard/payments', { method: 'GET' }),
          fetch('/api/dashboard/disputes', { method: 'GET' }),
        ]);
        const [pJson, dJson] = await Promise.all([pRes.json(), dRes.json()]);
        if (!pRes.ok) throw new Error(pJson.error || 'Failed to load payments');
        if (!dRes.ok) throw new Error(dJson.error || 'Failed to load disputes');
        setPayments((pJson.items || []) as PaymentRow[]);
        setDisputes(dJson.items || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return payments.filter((p) => {
      const matchText = !norm || [p.salt, p.payer, p.receiver, p.token, p.paymentInfoHash].some((v) => (v || '').toLowerCase().includes(norm));
      const matchStatus = !status || p.status === status;
      return matchText && matchStatus;
    });
  }, [payments, q, status]);

  const openDetail = async (row: PaymentRow) => {
    try {
      setSelected(row);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      const res = await fetch(`/api/dashboard/payments/${row.salt || row.paymentInfoHash}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load detail');
      setDetail(json as PaymentDetail);
    } catch (e: any) {
      setDetailError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const doRefund = async (row: PaymentRow) => {
    try {
      setLoading(true);
      const detailRes = await fetch(`/api/dashboard/payments/${row.salt || row.paymentInfoHash}`);
      const detail = await detailRes.json();
      if (!detailRes.ok) throw new Error(detail.error || 'Failed to fetch payment');
      const refundable = BigInt(detail.state.refundableAmount || '0');
      const amount = refundable > 0n ? (refundable / 2n).toString() : '0';
      if (amount === '0') throw new Error('No refundable amount');
      const res = await fetch('/api/dashboard/refunds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentInfo: detail.paymentInfo, amount }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Refund failed');
      toast.push({ kind: 'success', message: `Refund sent: ${json.txs.refundHash}` });
    } catch (e: any) {
      toast.push({ kind: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const doRefundByInfo = async (paymentInfo: any, amountUnits: string) => {
    try {
      const res = await fetch('/api/dashboard/refunds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentInfo, amount: amountUnits }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Refund failed');
      toast.push({ kind: 'success', message: `Refund sent: ${json.txs.refundHash}` });
    } catch (e: any) {
      toast.push({ kind: 'error', message: e.message });
    }
  };

  // Ops tab handlers
  const opBuild = async () => {
    try {
      setLoadingBuild(true);
      const res = await fetch('/api/payment/build', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'build failed');
      setOpsPaymentInfo(json.paymentInfo);
      toast.push({ kind: 'success', message: 'Built PaymentInfo' });
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingBuild(false); }
  };

  const opCharge = async () => {
    try {
      setLoadingCharge(true);
      const res = await fetch('/api/charge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amountDec: opsAmountDec }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'charge failed');
      appendLog({ op: 'approve', txHash: json.txs.approveHash, url: `${scanBase}/tx/${json.txs.approveHash}` });
      appendLog({ op: 'preApprove', txHash: json.txs.preApproveHash, url: `${scanBase}/tx/${json.txs.preApproveHash}` });
      appendLog({ op: 'charge', txHash: json.txs.chargeHash, url: `${scanBase}/tx/${json.txs.chargeHash}` });
      // Capture server-created paymentInfo so user can refund it if needed
      if (json.paymentInfo) {
        setOpsPaymentInfo(json.paymentInfo);
        appendLog({ op: 'paymentInfo', txHash: '', url: '', meta: { paymentInfo: json.paymentInfo } });
      }
      toast.push({ kind: 'success', message: 'Charge complete' });
      await refreshKpis();
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingCharge(false); }
  };

  const opAuthorizeCapture = async () => {
    try {
      setLoadingAuthCap(true);
      const res = await fetch('/api/authorize-capture', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'authorize-capture failed');
      appendLog({ op: 'authorize', txHash: json.txs.authorizeHash, url: `${scanBase}/tx/${json.txs.authorizeHash}` });
      appendLog({ op: 'capture', txHash: json.txs.captureHash, url: `${scanBase}/tx/${json.txs.captureHash}` });
      if (json.txs.approveHash) appendLog({ op: 'approve', txHash: json.txs.approveHash, url: `${scanBase}/tx/${json.txs.approveHash}` });
      if (json.txs.preApproveHash) appendLog({ op: 'preApprove', txHash: json.txs.preApproveHash, url: `${scanBase}/tx/${json.txs.preApproveHash}` });
      toast.push({ kind: 'success', message: 'Authorize + Capture complete' });
      await refreshKpis();
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingAuthCap(false); }
  };

  const opRefund = async () => {
    if (!opsPaymentInfo) return toast.push({ kind: 'error', message: 'Build or paste PaymentInfo first' });
    try {
      setLoadingRefund(true);
      const decs = kpis?.tokenMeta?.decimals ?? 18;
      const amt = toUnits(opsAmountDec || '0.01', decs);
      const res = await fetch('/api/dashboard/refunds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentInfo: opsPaymentInfo, amount: amt }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'refund failed');
      appendLog({ op: 'refund', txHash: json.txs.refundHash, url: `${scanBase}/tx/${json.txs.refundHash}` });
      toast.push({ kind: 'success', message: 'Refund sent' });
      await refreshKpis();
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingRefund(false); }
  };

  const opVoid = async () => {
    try {
      setLoadingVoid(true);
      const res = await fetch('/api/void', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'void failed');
      appendLog({ op: 'void', txHash: json.txs.voidHash, url: `${scanBase}/tx/${json.txs.voidHash}` });
      toast.push({ kind: 'success', message: 'Void complete' });
      await refreshKpis();
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingVoid(false); }
  };

  const opReclaim = async () => {
    try {
      setLoadingReclaim(true);
      const res = await fetch('/api/reclaim', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'reclaim failed');
      appendLog({ op: 'reclaim', txHash: json.txs.reclaimHash, url: `${scanBase}/tx/${json.txs.reclaimHash}` });
      toast.push({ kind: 'success', message: 'Reclaim complete' });
      await refreshKpis();
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setLoadingReclaim(false); }
  };

  // Dispute handlers (re-added)
  const openDisputeDetail = async (d: any) => {
    try {
      setSelectedDispute(d);
      setDisputeDetail(null);
      setDisputeLoading(true);
      setNewStatus(d.status || 'open');
      const res = await fetch(`/api/dashboard/payments/${d.paymentInfoHash}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load payment context');
      setDisputeDetail(json as PaymentDetail);
      const decimals = kpis?.tokenMeta?.decimals ?? 18;
      const refundable = json?.state?.refundableAmount || '0';
      setApproveAmountDec(refundable === '0' ? '' : (Number(BigInt(refundable)) / Number(10n ** BigInt(decimals))).toString());
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setDisputeLoading(false); }
  };

  const createDispute = async () => {
    if (!detail?.paymentInfoHash) return;
    try {
      setCreatingDispute(true);
      const res = await fetch('/api/dashboard/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentInfoHash: detail.paymentInfoHash, reason: disputeReason, notes: disputeNotes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create dispute');
      setDisputes((prev) => [json.item, ...prev]);
      setShowDispute(false);
      setDisputeReason('');
      setDisputeNotes('');
      toast.push({ kind: 'success', message: 'Dispute created' });
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setCreatingDispute(false); }
  };

  const addEvidence = async () => {
    if (!selectedDispute || !evidenceName || !evidenceUrl) return;
    try {
      const res = await fetch('/api/dashboard/disputes', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: selectedDispute.id, action: 'addEvidence', name: evidenceName, url: evidenceUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add evidence');
      setDisputes((prev) => prev.map((x) => (x.id === json.item.id ? json.item : x)));
      setSelectedDispute(json.item);
      setEvidenceName(''); setEvidenceUrl('');
      toast.push({ kind: 'success', message: 'Evidence added' });
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
  };

  const updateDisputeStatus = async () => {
    if (!selectedDispute || !newStatus) return;
    try {
      const res = await fetch('/api/dashboard/disputes', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: selectedDispute.id, action: 'setStatus', status: newStatus }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to set status');
      setDisputes((prev) => prev.map((x) => (x.id === json.item.id ? json.item : x)));
      setSelectedDispute(json.item);
      toast.push({ kind: 'success', message: 'Status updated' });
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
  };

  const approveRefund = async () => {
    if (!disputeDetail?.paymentInfo) return;
    try {
      setApprovingRefund(true);
      const decimals = kpis?.tokenMeta?.decimals ?? 18;
      const units = toUnits(approveAmountDec || '0', decimals);
      if (units === '0') throw new Error('Amount must be greater than 0');
      await doRefundByInfo(disputeDetail.paymentInfo, units);
      await Promise.all([refreshRefundables(), refreshKpis()]);
      const res = await fetch(`/api/dashboard/payments/${selectedDispute.paymentInfoHash}`);
      const json = await res.json();
      if (res.ok) setDisputeDetail(json as PaymentDetail);
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
    finally { setApprovingRefund(false); }
  };

  const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
  const decs = kpis?.tokenMeta?.decimals ?? 18;
  const sym = kpis?.tokenMeta?.symbol ?? '';

  const createDisputeFromTab = async () => {
    try {
      const res = await fetch('/api/dashboard/disputes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentInfoHash: newDisputeHash, reason: newDisputeReason, notes: newDisputeNotes }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create dispute');
      setDisputes((prev) => [json.item, ...prev]);
      setNewDisputeHash(''); setNewDisputeReason(''); setNewDisputeNotes('');
      toast.push({ kind: 'success', message: 'Dispute created' });
    } catch (e: any) { toast.push({ kind: 'error', message: e.message }); }
  };

  // Refunds analytics (client-side)
  const refundTotals = useMemo(() => {
    try {
      const total = refundables.reduce((acc, r) => acc + BigInt(r.remaining || '0'), 0n);
      return { count: refundables.length, total: total.toString() };
    } catch { return { count: refundables.length, total: '0' }; }
  }, [refundables]);

  const refundTrendBars = useMemo((): number[] => {
    const values = refundables.map((r) => BigInt(r.remaining || '0'));
    if (values.length === 0) return [] as number[];
    const max = values.reduce((a, b) => (a > b ? a : b), 0n);
    return values.map((v) => {
      if (max === 0n) return 0;
      const pct = Number((v * 100n) / max);
      return pct; // 0-100
    });
  }, [refundables]);

  const topReasons = useMemo((): [string, number][] => {
    const set = new Set<string>(refundables.map((r) => r.paymentInfoHash));
    const counts: Record<string, number> = {};
    for (const d of disputes) {
      if (set.has(d.paymentInfoHash)) counts[d.reason] = (counts[d.reason] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
  }, [refundables, disputes]);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <StatCard
            title="Live Payments"
            value={kpis ? formatAmount(kpis.live.volume, decs, sym) : '—'}
            subtitle={`in ${kpis?.live?.count ?? '—'} transactions`}
            icon={"💰"}
            color="bg-green-500/10"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
          <StatCard
            title="Refundable Now"
            value={kpis ? formatAmount(kpis.refundableNow, decs, sym) : '—'}
            icon={"↩️"}
            color="bg-blue-500/10"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
          <StatCard
            title="Active Disputes"
            value={kpis?.activeDisputes ?? '—'}
            icon={"⚖️"}
            color="bg-purple-500/10"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
          <StatCard
            title="Operator Balance"
            value={kpis?.operatorBalance ? formatAmount(kpis.operatorBalance.balance, kpis.operatorBalance.decimals, kpis.operatorBalance.symbol) : '—'}
            icon={"🏦"}
            color="bg-orange-500/10"
          />
        </motion.div>
      </div>

      <div className="flex gap-3">
        <Button variant={tab === 'payments' ? 'primary' : 'subtle'} onClick={() => setTab('payments')}>Payments</Button>
        <Button variant={tab === 'refunds' ? 'primary' : 'subtle'} onClick={() => setTab('refunds')}>Refunds</Button>
        <Button variant={tab === 'disputes' ? 'primary' : 'subtle'} onClick={() => setTab('disputes')}>Disputes</Button>
        <Button variant={tab === 'ops' ? 'primary' : 'subtle'} onClick={() => setTab('ops')}>Payment Ops</Button>
      </div>

      {tab === 'payments' && (
        <div className="flex gap-6">
          <div className="w-64 shrink-0">
            <Card variant="muted">
              <div className="font-semibold mb-2">Filters</div>
              <div className="space-y-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (salt, payer, token)" className="border rounded px-2 py-1 w-full" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-2 py-1 w-full">
                  <option value="">All statuses</option>
                  <option value="authorized">authorized</option>
                  <option value="captured">captured</option>
                  <option value="charged">charged</option>
                  <option value="refunded">refunded</option>
                  <option value="voided">voided</option>
                  <option value="reclaimed">reclaimed</option>
                </select>
              </div>
            </Card>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="glass">
                <Skeleton className="h-24" />
              </Card>
            ))}
            {!loading && filtered.map((p, idx) => (
              <motion.div key={p.paymentInfoHash} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.02 }}>
                <Card variant="glass" className="relative hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-[#2C3E50]">Payment</div>
                    <span className={`px-2 py-1 rounded text-white text-xs ${p.statusColor || 'bg-gray-400'}`}>{p.status || 'unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="info">{short(p.token)}</Badge>
                    <Badge variant="neutral">salt {short(p.salt)}</Badge>
                  </div>
                  <div className="text-xs text-gray-600">payer: <span className="font-mono">{short(p.payer)}</span></div>
                  <div className="text-xs text-gray-600">receiver: <span className="font-mono">{short(p.receiver)}</span></div>
                  <div className="text-xs text-gray-600 mt-2">Expires in {p.status === 'authorized' ? formatCountdown(p.authorizationExpiry) : p.status === 'charged' || p.status === 'captured' ? formatCountdown(p.refundExpiry) : '-'}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => openDetail(p)}>View</Button>
                    <Button size="sm" variant="subtle" onClick={() => doRefund(p)}>Refund 50%</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tab === 'refunds' && (
        <div className="flex gap-6">
          <motion.div className="flex-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="glass">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Refunds</div>
                <div className="flex gap-2">
                  <Button variant="subtle" onClick={refreshRefundables} disabled={refundsLoading}>Refresh</Button>
                  <Button variant="subtle" onClick={refreshKpis} disabled={refundsLoading}>Refresh KPIs</Button>
                </div>
              </div>
              {refundsLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>}
              {!refundsLoading && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Payment</th>
                      <th className="py-2">Payer</th>
                      <th className="py-2">Remaining</th>
                      <th className="py-2">Refund Deadline</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundables.map((r) => (
                      <tr key={r.paymentInfoHash} className="border-b hover:bg-[#F7F8FC]">
                        <td className="py-2 font-mono text-xs">{r.salt || r.paymentInfoHash}</td>
                        <td className="py-2 font-mono text-xs">{short(r.payer)}</td>
                        <td className="py-2 text-xs">{formatAmount(r.remaining, decs, sym)}</td>
                        <td className="py-2 text-xs">{formatCountdown(r.refundExpiry)}{r.refundExpiry ? '' : ''}</td>
                        <td className="py-2 text-xs flex gap-2">
                          <Button onClick={async () => {
                            const res = await fetch(`/api/dashboard/payments/${r.salt || r.paymentInfoHash}`);
                            const detail = await res.json();
                            if (!res.ok) return toast.push({ kind: 'error', message: detail.error || 'failed' });
                            await doRefundByInfo(detail.paymentInfo, r.remaining);
                            await refreshRefundables();
                          }}>Full Refund</Button>
                          <PartialRefundButton decs={decs} onRefund={async (amtDec) => {
                            const amtUnits = toUnits(amtDec, decs);
                            const res = await fetch(`/api/dashboard/payments/${r.salt || r.paymentInfoHash}`);
                            const detail = await res.json();
                            if (!res.ok) return toast.push({ kind: 'error', message: detail.error || 'failed' });
                            await doRefundByInfo(detail.paymentInfo, amtUnits);
                            await refreshRefundables();
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </motion.div>

          <div className="w-80 shrink-0 space-y-4">
            <Card>
              <div className="font-semibold mb-2">Totals</div>
              <div className="text-sm text-gray-600">Items: <b>{refundTotals.count}</b></div>
              <div className="text-sm text-gray-600">Remaining: <b>{formatAmount(refundTotals.total, decs, sym)}</b></div>
            </Card>
            <Card>
              <div className="font-semibold mb-2">Trend</div>
              <div className="flex items-end gap-1 h-14">
                {refundTrendBars.length === 0 && <div className="text-xs text-gray-500">No data</div>}
                {refundTrendBars.map((h, i) => (
                  <div key={i} className="w-2 bg-[#4A90E2]/70 rounded" style={{ height: `${Math.max(8, Math.min(100, h))}%` }} />
                ))}
              </div>
            </Card>
            <Card>
              <div className="font-semibold mb-2">Top reasons</div>
              {topReasons.length === 0 && <div className="text-xs text-gray-500">No reasons yet</div>}
              {topReasons.length > 0 && (
                <ul className="text-sm space-y-1">
                  {topReasons.map(([reason, count]) => (
                    <li key={reason} className="flex items-center justify-between"><span>{reason}</span><span className="text-gray-600">{count}</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="grid gap-4">
          <Card variant="glass">
            <div className="font-semibold mb-2">Create Dispute</div>
            <div className="grid md:grid-cols-3 gap-2">
              <input value={newDisputeHash} onChange={(e) => setNewDisputeHash(e.target.value)} placeholder="Payment hash or salt" className="border rounded px-2 py-1" />
              <select value={newDisputeReason} onChange={(e) => setNewDisputeReason(e.target.value)} className="border rounded px-2 py-1">
                <option value="">Reason</option>
                <option value="chargeback">Chargeback</option>
                <option value="quality issue">Quality issue</option>
                <option value="non-delivery">Non-delivery</option>
                <option value="cancellation">Cancellation</option>
              </select>
              <div className="flex gap-2">
                <input value={newDisputeNotes} onChange={(e) => setNewDisputeNotes(e.target.value)} placeholder="Notes (optional)" className="border rounded px-2 py-1 flex-1" />
                <Button onClick={createDisputeFromTab} disabled={!newDisputeHash || !newDisputeReason}>Create</Button>
              </div>
            </div>
          </Card>

          <Card variant="glass">
            <div className="mb-3 font-semibold">Disputes</div>
            {!loading && !error && disputes.length === 0 && <div className="text-gray-500 text-sm">No disputes</div>}
            {!loading && !error && disputes.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">ID</th>
                    <th className="py-2">Payment</th>
                    <th className="py-2">Reason</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-[#F7F8FC] cursor-pointer" onClick={() => openDisputeDetail(d)}>
                      <td className="py-2 text-xs">{d.id}</td>
                      <td className="py-2 font-mono text-xs">{d.paymentInfoHash}</td>
                      <td className="py-2 text-xs">{d.reason}</td>
                      <td className="py-2 text-xs">{d.status}</td>
                      <td className="py-2 text-xs">{d.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'ops' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-4">
            <Card>
              <div className="font-semibold">Build Payment</div>
              <div className="text-xs text-gray-600 mb-2">Creates a fresh PaymentInfo using env addresses and current time.</div>
              <div className="flex gap-2">
                <Button onClick={opBuild} disabled={loadingBuild}>{loadingBuild ? 'Building…' : 'Build'}</Button>
              </div>
            </Card>
            <Card>
              <div className="font-semibold">Charge</div>
              <div className="text-xs text-gray-600 mb-2">One-step authorize + capture. Amount (decimals: {decs})</div>
              <div className="flex gap-2 items-center">
                <input className="border rounded px-2 py-1 text-sm w-32" value={opsAmountDec} onChange={(e) => setOpsAmountDec(e.target.value)} />
                <Button onClick={opCharge} disabled={loadingCharge}>{loadingCharge ? 'Charging…' : 'Run Charge'}</Button>
              </div>
            </Card>
            <Card>
              <div className="font-semibold">Authorize + Capture</div>
              <div className="text-xs text-gray-600 mb-2">Runs two txs: authorize, then capture for the same amount.</div>
              <Button onClick={opAuthorizeCapture} disabled={loadingAuthCap}>{loadingAuthCap ? 'Processing…' : 'Run Authorize + Capture'}</Button>
            </Card>
            <Card>
              <div className="font-semibold">Refund</div>
              <div className="text-xs text-gray-600 mb-2">Requires PaymentInfo. Amount (decimals: {decs})</div>
              <div className="space-y-2">
                <textarea className="border rounded px-2 py-1 text-xs w-full h-28" placeholder="Paste PaymentInfo JSON (optional if you used Build)" value={opsPaymentInfo ? JSON.stringify(opsPaymentInfo, null, 2) : ''} onChange={(e) => {
                  try { const o = JSON.parse(e.target.value); setOpsPaymentInfo(o); } catch { /* noop */ }
                }} />
                <div className="flex gap-2 items-center">
                  <input className="border rounded px-2 py-1 text-sm w-32" value={opsAmountDec} onChange={(e) => setOpsAmountDec(e.target.value)} />
                  <Button onClick={opRefund} disabled={loadingRefund}>{loadingRefund ? 'Refunding…' : 'Refund'}</Button>
                </div>
              </div>
            </Card>
            <Card>
              <div className="font-semibold">Void</div>
              <div className="text-xs text-gray-600 mb-2">Returns uncaptured funds to payer. Uses demo env PaymentInfo.</div>
              <Button onClick={opVoid} disabled={loadingVoid}>{loadingVoid ? 'Voiding…' : 'Void'}</Button>
            </Card>
            <Card>
              <div className="font-semibold">Reclaim</div>
              <div className="text-xs text-gray-600 mb-2">Payer-initiated void (after authorization expiry). Uses demo env PaymentInfo.</div>
              <Button onClick={opReclaim} disabled={loadingReclaim}>{loadingReclaim ? 'Reclaiming…' : 'Reclaim'}</Button>
            </Card>
          </div>

          <div className="grid gap-4">
            <Card variant="glass">
              <div className="font-semibold mb-2">Results</div>
              {opsLogs.length === 0 && <div className="text-sm text-gray-500">No operations yet</div>}
              {opsLogs.length > 0 && (
                <ul className="text-sm space-y-1">
                  {opsLogs.map((l, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div>
                        <b>{l.op}</b>: <span className="font-mono text-xs">{short(l.txHash)}</span>
                      </div>
                      <a className="text-[#4A90E2] underline" href={l.url} target="_blank" rel="noreferrer">view</a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {opsPaymentInfo && (
              <Card variant="glass">
                <div className="font-semibold mb-2">Current PaymentInfo</div>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(opsPaymentInfo, null, 2)}</pre>
              </Card>
            )}
          </div>
        </div>
      )}

      {selected && tab === 'payments' && (
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div className="mb-3 font-semibold">Payment Detail</div>
            <div className="flex gap-2">
              <Button onClick={() => setShowDispute(true)} disabled={detailLoading || !detail}>Create Dispute</Button>
              <Button onClick={() => { setSelected(null); setDetail(null); }}>Close</Button>
            </div>
          </div>
          {detailLoading && <div>Loading...</div>}
          {detailError && <div className="text-red-600">{detailError}</div>}
          {detail && (
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <b>PaymentInfo</b>
                  <pre className="bg-gray-50 p-2 rounded mt-2 text-xs">{JSON.stringify(detail.paymentInfo, null, 2)}</pre>
                </div>
                <div>
                  <b>State</b>
                  <pre className="bg-gray-50 p-2 rounded mt-2 text-xs">{JSON.stringify(detail.state, null, 2)}</pre>
                </div>
              </div>
              <div>
                <b>Timeline</b>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
                  {detail.timeline.map((t, i) => (
                    <li key={i}>
                      <span className="font-mono">{String(t.blockNumber)}</span> — {t.type} {t.data?.amount ? `(amount: ${t.data.amount})` : ''}
                      {t.txHash && (
                        <a className="text-[#4A90E2] underline ml-2" href={`${scanBase}/tx/${t.txHash}`} target="_blank" rel="noreferrer">view</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {showDispute && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-lg">
            <div className="text-lg font-semibold mb-3">Create Dispute</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Reason</label>
                <select className="border rounded px-2 py-1 w-full" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
                  <option value="">Select reason</option>
                  <option value="chargeback">Chargeback</option>
                  <option value="quality issue">Quality issue</option>
                  <option value="non-delivery">Non-delivery</option>
                  <option value="cancellation">Cancellation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Notes</label>
                <textarea className="border rounded px-2 py-1 w-full" rows={4} value={disputeNotes} onChange={(e) => setDisputeNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={() => setShowDispute(false)} disabled={creatingDispute}>Cancel</Button>
                <Button onClick={createDispute} disabled={creatingDispute || !disputeReason}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!selectedDispute} onClose={() => { setSelectedDispute(null); setDisputeDetail(null); }} title={selectedDispute ? `Dispute #${selectedDispute.id}` : undefined}>
        {selectedDispute && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Payment</div>
                <div className="font-mono text-xs break-all">{selectedDispute.paymentInfoHash}</div>
                <div className="mt-2 text-sm text-gray-600">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <select className="border rounded px-2 py-1 text-sm" value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)}>
                    <option value="open">open</option>
                    <option value="pending">pending</option>
                    <option value="resolved">resolved</option>
                  </select>
                  <Button variant="subtle" onClick={updateDisputeStatus}>Set Status</Button>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold mb-1">Evidence</div>
                  {selectedDispute.attachments?.length === 0 && <div className="text-xs text-gray-500">No evidence</div>}
                  {selectedDispute.attachments?.length > 0 && (
                    <ul className="text-xs list-disc ml-5 space-y-1">
                      {selectedDispute.attachments.map((a: any, i: number) => (
                        <li key={i}><a className="text-[#4A90E2] underline" href={a.url} target="_blank" rel="noreferrer">{a.name}</a></li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Evidence name" value={evidenceName} onChange={(e) => setEvidenceName(e.target.value)} />
                    <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Evidence URL" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
                    <Button onClick={addEvidence} disabled={!evidenceName || !evidenceUrl}>Add</Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-1">Payment Context</div>
                {disputeLoading && <div className="text-sm">Loading...</div>}
                {!disputeLoading && !disputeDetail && <div className="text-sm text-gray-500">Not available</div>}
                {disputeDetail && (
                  <div className="space-y-2">
                    <div className="text-xs"><b>payer</b>: <span className="font-mono">{short(disputeDetail.paymentInfo?.payer)}</span></div>
                    <div className="text-xs"><b>receiver</b>: <span className="font-mono">{short(disputeDetail.paymentInfo?.receiver)}</span></div>
                    <div className="text-xs"><b>refundable</b>: {formatAmount(disputeDetail.state.refundableAmount, decs, sym)}</div>
                    <div className="text-xs"><b>refund expiry</b>: {formatCountdown(disputeDetail.paymentInfo?.refundExpiry)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-sm font-semibold mb-1">Approve Refund</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Amount ({decs} dec)</div>
                  <input className="border rounded px-2 py-1 w-full text-sm" value={approveAmountDec} onChange={(e) => setApproveAmountDec(e.target.value)} placeholder="e.g. 0.01" />
                </div>
                <Button onClick={approveRefund} disabled={approvingRefund || !disputeDetail}>Approve</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PartialRefundButton({ onRefund, decs }: { onRefund: (amountDec: string) => Promise<void>; decs: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  return (
    <div className="relative inline-block">
      <Button variant="subtle" onClick={() => setOpen((v) => !v)}>Partial Refund</Button>
      {open && (
        <div className="absolute z-10 mt-2 bg-card border border-gray-200 rounded p-2 shadow">
          <div className="text-xs mb-1">Amount ({decs} dec)</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 0.005" className="border rounded px-2 py-1 w-40 text-sm" />
          <div className="flex gap-2 mt-2 justify-end">
            <Button variant="subtle" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await onRefund(amount); setOpen(false); }}>Refund</Button>
          </div>
        </div>
      )}
    </div>
  );
} 