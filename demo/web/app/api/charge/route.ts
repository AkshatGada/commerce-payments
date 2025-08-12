import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, PREAPPROVAL_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST() {
  try {
    const env = process.env as Record<string, string>;
    const { RPC_URL, OPERATOR_PRIVATE_KEY, RELAYER_PRIVATE_KEY, PAYER_PRIVATE_KEY, AUTH_CAPTURE_ESCROW, PREAPPROVAL_COLLECTOR, DEMO_TOKEN, MERCHANT } = env;
    if (!RPC_URL) throw new Error('Missing RPC_URL');
    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');
    if (!PAYER_PRIVATE_KEY) throw new Error('Missing PAYER_PRIVATE_KEY');
    if (!AUTH_CAPTURE_ESCROW || !PREAPPROVAL_COLLECTOR || !DEMO_TOKEN || !MERCHANT) throw new Error('Missing required envs');

    const normalizePk = (pk: string): Hex => {
      const hex = pk.startsWith('0x') ? pk : `0x${pk}`;
      if (hex.length !== 66) throw new Error('Invalid private key length');
      return hex as Hex;
    };

    const operatorAccount = privateKeyToAccount(normalizePk(operatorPkRaw));
    const payerAccount = privateKeyToAccount(normalizePk(PAYER_PRIVATE_KEY));

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operatorWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operatorAccount });
    const payerWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: payerAccount });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const preApprovalCollector = getAddress(PREAPPROVAL_COLLECTOR);
    const payer = payerAccount.address;
    const merchant = getAddress(MERCHANT);

    const amount = 10n ** 16n;

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

    // payer nonces
    const payerNonceBase = await publicClient.getTransactionCount({ address: payer, blockTag: 'pending' });

    // approve and preApprove
    const approveHash = await payerWallet.writeContract({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [preApprovalCollector, amount], nonce: payerNonceBase });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    const preApproveHash = await payerWallet.writeContract({ address: preApprovalCollector, abi: PREAPPROVAL_ABI, functionName: 'preApprove', args: [paymentInfo], nonce: payerNonceBase + 1 });
    await publicClient.waitForTransactionReceipt({ hash: preApproveHash });

    // operator charge
    const operatorNonceBase = await publicClient.getTransactionCount({ address: operatorAccount.address, blockTag: 'pending' });
    const chargeHash = await operatorWallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: 'charge', args: [paymentInfo, amount, preApprovalCollector, '0x', 0, '0x0000000000000000000000000000000000000000'], nonce: operatorNonceBase });
    await publicClient.waitForTransactionReceipt({ hash: chargeHash });

    return NextResponse.json({ txs: { approveHash, preApproveHash, chargeHash } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'charge failed' }, { status: 500 });
  }
} 