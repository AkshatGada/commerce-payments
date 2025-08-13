import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, OPERATOR_PRIVATE_KEY, RELAYER_PRIVATE_KEY, AUTH_CAPTURE_ESCROW, PREAPPROVAL_COLLECTOR, DEMO_TOKEN, MERCHANT, PAYER } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');
    if (!AUTH_CAPTURE_ESCROW || !PREAPPROVAL_COLLECTOR || !DEMO_TOKEN || !MERCHANT || !PAYER) throw new Error('Missing required envs');

    const normalizePk = (pk: string): Hex => {
      const hex = pk.startsWith('0x') ? pk : `0x${pk}`;
      if (hex.length !== 66) throw new Error('Invalid private key length');
      return hex as Hex;
    };

    const operatorAccount = privateKeyToAccount(normalizePk(operatorPkRaw));
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operatorWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operatorAccount });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const preApprovalCollector = getAddress(PREAPPROVAL_COLLECTOR);
    const payer = getAddress(PAYER);
    const merchant = getAddress(MERCHANT);

    // Use 0.01 with token decimals
    const decimals = await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }) as number;
    const amount = (10n ** BigInt(decimals)) / 100n;

    const now = Math.floor(Date.now() / 1000);
    const paymentInfo = {
      operator: operatorAccount.address,
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

    const tokenStore = await publicClient.readContract({ address: escrow, abi: ESCROW_ABI, functionName: 'getTokenStore', args: [operatorAccount.address] });

    const balancesBefore = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    const operatorNonceBase = await publicClient.getTransactionCount({ address: operatorAccount.address, blockTag: 'pending' });

    const authorizeHash = await operatorWallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'authorize', args: [paymentInfo, amount, preApprovalCollector, '0x'], nonce: operatorNonceBase });
    await publicClient.waitForTransactionReceipt({ hash: authorizeHash });

    const captureHash = await operatorWallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'capture', args: [paymentInfo, amount, 0, '0x0000000000000000000000000000000000000000'], nonce: operatorNonceBase + 1 });
    await publicClient.waitForTransactionReceipt({ hash: captureHash });

    const balancesAfter = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    return NextResponse.json({
      addresses: { escrow, token, operator: operatorAccount.address, payer, merchant, tokenStore },
      txs: { authorizeHash, captureHash },
      balancesBefore,
      balancesAfter,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'authorize-capture failed' }, { status: 500 });
  }
} 