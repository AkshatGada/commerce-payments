import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, type Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { ESCROW_ABI, ESCROW_EVENTS } from '@/lib/abi';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW } = env;
    if (!RPC_URL || !AUTH_CAPTURE_ESCROW) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    const id = params.id;
    const looksLikeHash = id.startsWith('0x') && id.length === 66;

    // Load recent logs to resolve by salt if needed
    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest - 5000n > 0n ? latest - 5000n : 0n;

    // If provided id is a hash, use directly; else try to locate by salt
    let paymentInfoHash: Hex | null = null;

    if (looksLikeHash) {
      paymentInfoHash = id as Hex;
    } else {
      const authorized = await publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock });
      const charged = await publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock });
      const candidate = [...authorized, ...charged].find((l: any) => String(l.args.paymentInfo.salt) === id);
      if (candidate) paymentInfoHash = candidate.args.paymentInfoHash as Hex;
    }

    if (!paymentInfoHash) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    // Read current state
    const state = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'paymentState', args: [paymentInfoHash] });

    // Resolve base info from the most recent of Authorized/Charged
    const [authorized, charged] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[0], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[2], fromBlock }),
    ]);
    const head = [...authorized, ...charged]
      .filter((l: any) => l.args.paymentInfoHash === paymentInfoHash)
      .sort((a: any, b: any) => Number((b as any).blockNumber - (a as any).blockNumber))[0] as any;

    const info = head?.args?.paymentInfo as any;

    // Build timeline (captured, refunded, voided, reclaimed)
    const [captures, refunds, voids, reclaims] = await Promise.all([
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[1], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[3], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[4], fromBlock }),
      publicClient.getLogs({ address: escrow, event: ESCROW_EVENTS[5], fromBlock }),
    ]);

    const filterByHash = (logs: any[]) => logs.filter((l: any) => l.args.paymentInfoHash === paymentInfoHash);

    const timeline = [
      ...filterByHash(authorized).map((l: any) => ({ type: 'authorized', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount) } })),
      ...filterByHash(charged).map((l: any) => ({ type: 'charged', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount) } })),
      ...filterByHash(captures).map((l: any) => ({ type: 'captured', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount), feeBps: Number(l.args.feeBps), feeReceiver: l.args.feeReceiver } })),
      ...filterByHash(refunds).map((l: any) => ({ type: 'refunded', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount) } })),
      ...filterByHash(voids).map((l: any) => ({ type: 'voided', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount) } })),
      ...filterByHash(reclaims).map((l: any) => ({ type: 'reclaimed', blockNumber: Number(l.blockNumber), txHash: l.transactionHash, data: { amount: String(l.args.amount) } })),
    ].sort((a, b) => Number(a.blockNumber - b.blockNumber));

    return NextResponse.json({
      paymentInfoHash,
      paymentInfo: info ? {
        operator: info.operator,
        payer: info.payer,
        receiver: info.receiver,
        token: info.token,
        maxAmount: String(info.maxAmount),
        preApprovalExpiry: Number(info.preApprovalExpiry),
        authorizationExpiry: Number(info.authorizationExpiry),
        refundExpiry: Number(info.refundExpiry),
        minFeeBps: Number(info.minFeeBps),
        maxFeeBps: Number(info.maxFeeBps),
        feeReceiver: info.feeReceiver,
        salt: String(info.salt),
      } : null,
      state: { hasCollectedPayment: (state as any)[0], capturableAmount: String((state as any)[1]), refundableAmount: String((state as any)[2]) },
      timeline,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
} 