import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { ESCROW_ABI } from '@/lib/abi';

export async function POST() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, AUTH_CAPTURE_ESCROW, DEMO_TOKEN, MERCHANT, PAYER, OPERATOR } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    if (!AUTH_CAPTURE_ESCROW || !DEMO_TOKEN || !MERCHANT || !PAYER || !OPERATOR) throw new Error('Missing required envs');

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const payer = getAddress(PAYER);
    const operator = getAddress(OPERATOR);
    const merchant = getAddress(MERCHANT);

    const amount = 10n ** 16n;
    const now = Math.floor(Date.now() / 1000);

    const paymentInfo = {
      operator,
      payer,
      receiver: merchant,
      token,
      maxAmount: amount,
      preApprovalExpiry: now + 3600,
      authorizationExpiry: now + 7200,
      refundExpiry: now + 10800,
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: '0x0000000000000000000000000000000000000000',
      salt: BigInt(now),
    } as const;

    const tokenStore = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'getTokenStore', args: [operator] });

    return NextResponse.json({ paymentInfo, addresses: { escrow, token, operator, payer, merchant, tokenStore } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'build failed' }, { status: 500 });
  }
} 