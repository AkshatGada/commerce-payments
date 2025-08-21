import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST(req: Request) {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, OPERATOR_PRIVATE_KEY, RELAYER_PRIVATE_KEY, AUTH_CAPTURE_ESCROW, DEMO_TOKEN, MERCHANT, PAYER } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');
    if (!AUTH_CAPTURE_ESCROW || !DEMO_TOKEN || !MERCHANT || !PAYER) throw new Error('Missing required envs');

    const normalizePk = (pk: string): Hex => (pk.startsWith('0x') ? (pk as Hex) : (`0x${pk}` as Hex));

    const operatorAccount = privateKeyToAccount(normalizePk(operatorPkRaw));
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operatorWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operatorAccount });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const payer = getAddress(PAYER);
    const merchant = getAddress(MERCHANT);

    // Allow optional paymentInfo in request body to void a specific payment
    let paymentInfo: any = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.paymentInfo) paymentInfo = body.paymentInfo;
    } catch {
      // ignore parse errors
    }

    if (!paymentInfo) {
      const now = Math.floor(Date.now() / 1000);
      paymentInfo = {
        operator: operatorAccount.address,
        payer,
        receiver: merchant,
        token,
        maxAmount: 10n ** 16n,
        preApprovalExpiry: now + 3600,
        authorizationExpiry: now + 7200,
        refundExpiry: now + 10800,
        minFeeBps: 0,
        maxFeeBps: 0,
        feeReceiver: '0x0000000000000000000000000000000000000000',
        salt: BigInt(now),
      } as const;
    }

    const tokenStore = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'getTokenStore', args: [operatorAccount.address] });

    const balancesBeforeRaw = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };
    const balancesBefore = {
      payer: balancesBeforeRaw.payer.toString(),
      merchant: balancesBeforeRaw.merchant.toString(),
      tokenStore: balancesBeforeRaw.tokenStore.toString(),
    };

    const opNonce = await publicClient.getTransactionCount({ address: operatorAccount.address, blockTag: 'pending' });
    const voidHash = await operatorWallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'void', args: [paymentInfo], nonce: opNonce });
    await publicClient.waitForTransactionReceipt({ hash: voidHash });

    const balancesAfterRaw = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };
    const balancesAfter = {
      payer: balancesAfterRaw.payer.toString(),
      merchant: balancesAfterRaw.merchant.toString(),
      tokenStore: balancesAfterRaw.tokenStore.toString(),
    };

    return NextResponse.json({ addresses: { escrow, token, operator: operatorAccount.address, payer, merchant, tokenStore }, txs: { voidHash }, balancesBefore, balancesAfter });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'void failed' }, { status: 500 });
  }
} 