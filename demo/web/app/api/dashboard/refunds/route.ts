import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, ESCROW_ABI, ESCROW_EVENTS } from '@/lib/abi';

export async function GET() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) return NextResponse.json({ items: [] });

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest - 5000n > 0n ? latest - 5000n : 0n;

    // Candidates are those with captured/charged and before refundExpiry, minus already fully refunded (approximate)
    const [authorized, charged, captured, refunded] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[1], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[3], fromBlock }),
    ]);

    // Build captured amounts map and refund sums map
    const baseInfo = new Map<string, any>();
    for (const log of [...authorized, ...charged]) {
      const info = (log as any).args.paymentInfo as any;
      baseInfo.set((log as any).args.paymentInfoHash, info);
    }
    const capturedSum = new Map<string, bigint>();
    for (const log of captured) {
      const k = (log as any).args.paymentInfoHash as string;
      capturedSum.set(k, (capturedSum.get(k) || 0n) + BigInt((log as any).args.amount));
    }
    const refundedSum = new Map<string, bigint>();
    for (const log of refunded) {
      const k = (log as any).args.paymentInfoHash as string;
      refundedSum.set(k, (refundedSum.get(k) || 0n) + BigInt((log as any).args.amount));
    }

    const items = Array.from(capturedSum.entries()).map(([hash, cap]) => {
      const ref = refundedSum.get(hash) || 0n;
      const info = baseInfo.get(hash);
      const remaining = cap > ref ? cap - ref : 0n;
      return { paymentInfoHash: hash, remaining: remaining.toString(), refundExpiry: info?.refundExpiry, payer: info?.payer, token: info?.token, salt: String(info?.salt ?? '') };
    }).filter((x) => Number(x.refundExpiry ?? 0) > Math.floor(Date.now() / 1000) && BigInt(x.remaining) > 0n);

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentInfo, amount, tokenCollector } = body as { paymentInfo: any; amount: string; tokenCollector?: string };

    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW, OPERATOR_REFUND_COLLECTOR, OPERATOR_PRIVATE_KEY, RELAYER_PRIVATE_KEY } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operator = privateKeyToAccount((operatorPkRaw.startsWith('0x') ? operatorPkRaw : `0x${operatorPkRaw}`) as Hex);
    const wallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operator });

    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const amt = BigInt(amount);
    const collector = getAddress(tokenCollector ?? OPERATOR_REFUND_COLLECTOR);

    const nonce = await publicClient.getTransactionCount({ address: operator.address, blockTag: 'pending' });
    const refundHash = await wallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'refund', args: [paymentInfo, amt, collector, '0x'], nonce });
    await publicClient.waitForTransactionReceipt({ hash: refundHash });

    return NextResponse.json({ txs: { refundHash } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 