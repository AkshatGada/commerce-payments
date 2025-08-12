import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, PAYER_PRIVATE_KEY, AUTH_CAPTURE_ESCROW, DEMO_TOKEN, MERCHANT, PAYER, OPERATOR } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    if (!PAYER_PRIVATE_KEY) throw new Error('Missing PAYER_PRIVATE_KEY');
    if (!AUTH_CAPTURE_ESCROW || !DEMO_TOKEN || !MERCHANT || !PAYER || !OPERATOR) throw new Error('Missing required envs');

    const normalizePk = (pk: string): Hex => (pk.startsWith('0x') ? (pk as Hex) : (`0x${pk}` as Hex));

    const payerAccount = privateKeyToAccount(normalizePk(PAYER_PRIVATE_KEY));
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const payerWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: payerAccount });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const payer = getAddress(PAYER);
    const operator = getAddress(OPERATOR);
    const merchant = getAddress(MERCHANT);

    const now = Math.floor(Date.now() / 1000);
    const paymentInfo = {
      operator,
      payer,
      receiver: merchant,
      token,
      maxAmount: 10n ** 16n,
      preApprovalExpiry: now + 1, // already expired for demo
      authorizationExpiry: now - 1, // ensure reclaim is allowed
      refundExpiry: now + 10800,
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: '0x0000000000000000000000000000000000000000',
      salt: BigInt(now - 1000),
    } as const;

    const tokenStore = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'getTokenStore', args: [operator] });

    const balancesBefore = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    const payerNonce = await publicClient.getTransactionCount({ address: payerAccount.address, blockTag: 'pending' });
    const reclaimHash = await payerWallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'reclaim', args: [paymentInfo], nonce: payerNonce });
    await publicClient.waitForTransactionReceipt({ hash: reclaimHash });

    const balancesAfter = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    return NextResponse.json({ addresses: { escrow, token, operator, payer, merchant, tokenStore }, txs: { reclaimHash }, balancesBefore, balancesAfter });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'reclaim failed' }, { status: 500 });
  }
} 