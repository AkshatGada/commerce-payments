import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, getAddress, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentInfo = body?.paymentInfo as any;
    const amountStr = body?.amount as string | undefined;

    const env = process.env as Record<string, string>;
    const { RPC_URL, OPERATOR_PRIVATE_KEY, RELAYER_PRIVATE_KEY, AUTH_CAPTURE_ESCROW } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');
    if (!AUTH_CAPTURE_ESCROW) throw new Error('Missing AUTH_CAPTURE_ESCROW');
    if (!paymentInfo) throw new Error('Missing paymentInfo in request body');

    const normalizePk = (pk: string): Hex => {
      const hex = pk.startsWith('0x') ? pk : `0x${pk}`;
      if (hex.length !== 66) throw new Error('Invalid private key length');
      return hex as Hex;
    };
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operator = privateKeyToAccount(normalizePk(operatorPkRaw));
    const wallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operator });

    const escrow = getAddress(AUTH_CAPTURE_ESCROW);

    const amount = amountStr ? BigInt(amountStr) : BigInt(paymentInfo.maxAmount || 0);

    const nonce = await publicClient.getTransactionCount({ address: operator.address, blockTag: 'pending' });
    const captureHash = await wallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'capture', args: [paymentInfo, amount, 0, '0x0000000000000000000000000000000000000000'], nonce });
    await publicClient.waitForTransactionReceipt({ hash: captureHash });

    return NextResponse.json({ txs: { captureHash }, paymentInfo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'capture failed' }, { status: 500 });
  }
} 