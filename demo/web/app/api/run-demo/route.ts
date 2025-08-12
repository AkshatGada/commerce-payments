import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Hex, getAddress } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ERC20_ABI, PREAPPROVAL_ABI, ESCROW_ABI } from '@/lib/abi';

export async function POST() {
  try {
    const env = process.env as Record<string, string>;
    const {
      RPC_URL,
      RELAYER_PRIVATE_KEY, // operator key (backward compatibility)
      OPERATOR_PRIVATE_KEY, // preferred
      PAYER_PRIVATE_KEY,    // payer key (required for separate operator/payer)
      AUTH_CAPTURE_ESCROW,
      PREAPPROVAL_COLLECTOR,
      DEMO_TOKEN,
      PAYER,   // optional, will be validated against PAYER_PRIVATE_KEY if provided
      MERCHANT,
      PAYMENT_SALT,
    } = env;

    if (!RPC_URL) throw new Error('Missing RPC_URL');
    const operatorPkRaw = (OPERATOR_PRIVATE_KEY || RELAYER_PRIVATE_KEY) as string | undefined;
    if (!operatorPkRaw) throw new Error('Missing OPERATOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY)');
    if (!PAYER_PRIVATE_KEY) throw new Error('Missing PAYER_PRIVATE_KEY');
    if (!AUTH_CAPTURE_ESCROW || !PREAPPROVAL_COLLECTOR || !DEMO_TOKEN || !MERCHANT) {
      throw new Error('Missing one of AUTH_CAPTURE_ESCROW, PREAPPROVAL_COLLECTOR, DEMO_TOKEN, MERCHANT');
    }

    const normalizePk = (pk: string): Hex => {
      const hex = pk.startsWith('0x') ? pk : `0x${pk}`;
      if (hex.length !== 66) throw new Error('Invalid private key length');
      return hex as Hex;
    };

    const operatorAccount = privateKeyToAccount(normalizePk(operatorPkRaw));
    const payerAccount = privateKeyToAccount(normalizePk(PAYER_PRIVATE_KEY));

    if (PAYER && getAddress(PAYER) !== payerAccount.address) {
      throw new Error('PAYER env does not match PAYER_PRIVATE_KEY address');
    }

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const operatorWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: operatorAccount });
    const payerWallet = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account: payerAccount });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const preApprovalCollector = getAddress(PREAPPROVAL_COLLECTOR);
    const operator = operatorAccount.address;
    const payer = payerAccount.address;
    const merchant = getAddress(MERCHANT);

    const amount = 10n ** 16n; // 0.01 (18 decimals)

    const now = Math.floor(Date.now() / 1000);
    const preApprovalExpiry = BigInt(now + 60 * 60);
    const authorizationExpiry = BigInt(now + 2 * 60 * 60);
    const refundExpiry = BigInt(now + 3 * 60 * 60);
    const salt = PAYMENT_SALT ? BigInt(PAYMENT_SALT) : BigInt(now);

    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }),
    ]);

    const paymentInfo = {
      operator,
      payer,
      receiver: merchant,
      token,
      maxAmount: amount,
      preApprovalExpiry: Number(preApprovalExpiry),
      authorizationExpiry: Number(authorizationExpiry),
      refundExpiry: Number(refundExpiry),
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: '0x0000000000000000000000000000000000000000',
      salt,
    } as const;

    const tokenStore = await publicClient.readContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: 'getTokenStore',
      args: [operator],
    });

    const balancesBefore = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    // Get nonces (pending)
    const payerNonceBase = BigInt(await publicClient.getTransactionCount({ address: payer, blockTag: 'pending' }));
    const operatorNonceBase = BigInt(await publicClient.getTransactionCount({ address: operator, blockTag: 'pending' }));

    // 1) approve (payer)
    const approveHash = await payerWallet.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [preApprovalCollector, amount],
      nonce: Number(payerNonceBase),
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // 2) preApprove (payer)
    const preApproveHash = await payerWallet.writeContract({
      address: preApprovalCollector,
      abi: PREAPPROVAL_ABI,
      functionName: 'preApprove',
      args: [paymentInfo],
      nonce: Number(payerNonceBase + 1n),
    });
    await publicClient.waitForTransactionReceipt({ hash: preApproveHash });

    // 3) authorize (operator)
    const authorizeHash = await operatorWallet.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: 'authorize',
      args: [paymentInfo, amount, preApprovalCollector, '0x'],
      nonce: Number(operatorNonceBase),
    });
    await publicClient.waitForTransactionReceipt({ hash: authorizeHash });

    // 4) capture (fee=0) (operator)
    const captureHash = await operatorWallet.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: 'capture',
      args: [paymentInfo, amount, 0, '0x0000000000000000000000000000000000000000'],
      nonce: Number(operatorNonceBase + 1n),
    });
    await publicClient.waitForTransactionReceipt({ hash: captureHash });

    const balancesAfter = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    return NextResponse.json({
      chainId: polygonAmoy.id,
      token: { symbol, decimals },
      addresses: { escrow, preApprovalCollector, token, operator, payer, merchant, tokenStore },
      txs: { approveHash, preApproveHash, authorizeHash, captureHash },
      balancesBefore,
      balancesAfter,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'run-demo failed' }, { status: 500 });
  }
} 