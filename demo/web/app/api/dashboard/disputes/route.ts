import { NextResponse } from 'next/server';

// Simple in-memory store for demo purposes (non-persistent)
const store: { disputes: any[] } = (globalThis as any).__DISPUTES__ || { disputes: [] };
(globalThis as any).__DISPUTES__ = store;

export async function GET() {
  try {
    return NextResponse.json({ items: store.disputes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentInfoHash, reason, notes, attachments } = body as { paymentInfoHash: string; reason: string; notes?: string; attachments?: { name: string; url: string }[] };
    if (!paymentInfoHash || !reason) return NextResponse.json({ error: 'paymentInfoHash and reason are required' }, { status: 400 });

    const now = new Date().toISOString();
    const item = {
      id: `${Date.now()}`,
      paymentInfoHash,
      reason,
      notes: notes ?? '',
      attachments: attachments ?? [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: 'created', by: 'merchant' }],
    };
    store.disputes.unshift(item);

    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body as { id: string; action: 'addEvidence' | 'setStatus'; [k: string]: any };
    const idx = store.disputes.findIndex((d) => d.id === id);
    if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const now = new Date().toISOString();

    if (action === 'addEvidence') {
      const { name, url } = body as { name: string; url: string };
      if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 });
      store.disputes[idx].attachments.push({ name, url });
      store.disputes[idx].history.push({ at: now, action: 'addEvidence', by: 'merchant', data: { name, url } });
      store.disputes[idx].updatedAt = now;
    } else if (action === 'setStatus') {
      const { status } = body as { status: 'open' | 'pending' | 'resolved' };
      if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });
      store.disputes[idx].status = status;
      store.disputes[idx].history.push({ at: now, action: 'setStatus', by: 'merchant', data: { status } });
      store.disputes[idx].updatedAt = now;
    } else {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    return NextResponse.json({ item: store.disputes[idx] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 