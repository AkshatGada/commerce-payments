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
      RELAYER_PRIVATE_KEY,
      AUTH_CAPTURE_ESCROW,
      PREAPPROVAL_COLLECTOR,
      DEMO_TOKEN,
      PAYER,
      MERCHANT,
      PAYMENT_SALT,
    } = env;

    if (!RPC_URL) throw new Error('Missing RPC_URL');
    if (!RELAYER_PRIVATE_KEY) throw new Error('Missing RELAYER_PRIVATE_KEY');
    if (!AUTH_CAPTURE_ESCROW || !PREAPPROVAL_COLLECTOR || !DEMO_TOKEN || !MERCHANT) {
      throw new Error('Missing one of AUTH_CAPTURE_ESCROW, PREAPPROVAL_COLLECTOR, DEMO_TOKEN, MERCHANT');
    }

    const account = privateKeyToAccount(RELAYER_PRIVATE_KEY as Hex);
    if (PAYER && getAddress(PAYER) !== account.address) {
      throw new Error('RELAYER must equal PAYER for this basic demo');
    }

    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ chain: polygonAmoy, transport: http(RPC_URL), account });

    const token = getAddress(DEMO_TOKEN);
    const escrow = getAddress(AUTH_CAPTURE_ESCROW);
    const preApprovalCollector = getAddress(PREAPPROVAL_COLLECTOR);
    const payer = account.address;
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
      operator: payer,
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
      args: [payer],
    });

    const balancesBefore = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    // 1) approve
    const approveHash = await walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [preApprovalCollector, amount],
    });

    // 2) preApprove
    const preApproveHash = await walletClient.writeContract({
      address: preApprovalCollector,
      abi: PREAPPROVAL_ABI,
      functionName: 'preApprove',
      args: [paymentInfo],
    });

    // 3) authorize
    const authorizeHash = await walletClient.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: 'authorize',
      args: [paymentInfo, amount, preApprovalCollector, '0x'],
    });

    // 4) capture (fee=0)
    const captureHash = await walletClient.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: 'capture',
      args: [paymentInfo, amount, 0, '0x0000000000000000000000000000000000000000'],
    });

    const balancesAfter = {
      payer: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [payer] })) as bigint,
      merchant: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [merchant] })) as bigint,
      tokenStore: (await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [tokenStore] })) as bigint,
    };

    return NextResponse.json({
      chainId: polygonAmoy.id,
      token: { symbol, decimals },
      addresses: { escrow, preApprovalCollector, token, payer, merchant, tokenStore },
      txs: { approveHash, preApproveHash, authorizeHash, captureHash },
      balancesBefore,
      balancesAfter,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'run-demo failed' }, { status: 500 });
  }
} 