const { createPublicClient, http, getAddress } = require('viem');
const { polygonAmoy } = require('viem/chains');
const { ESCROW_ABI, ERC20_ABI } = require('./lib/abi.ts');

require('dotenv').config({ path: '.env.local' });

async function debugPayment() {
  const env = process.env;
  const publicClient = createPublicClient({ 
    chain: polygonAmoy, 
    transport: http(env.RPC_URL) 
  });

  const token = getAddress(env.DEMO_TOKEN);
  const escrow = getAddress(env.AUTH_CAPTURE_ESCROW);
  const operator = getAddress(env.OPERATOR);
  
  console.log('=== TOKEN INFO ===');
  const decimals = await publicClient.readContract({ 
    address: token, 
    abi: ERC20_ABI, 
    functionName: 'decimals' 
  });
  console.log('Decimals:', decimals);
  
  const tokenStore = await publicClient.readContract({ 
    address: escrow, 
    abi: ESCROW_ABI, 
    functionName: 'getTokenStore', 
    args: [operator] 
  });
  console.log('TokenStore:', tokenStore);
  
  // Check balance
  const balance = await publicClient.readContract({ 
    address: token, 
    abi: ERC20_ABI, 
    functionName: 'balanceOf', 
    args: [tokenStore] 
  });
  console.log('TokenStore balance:', balance.toString());
}

debugPayment().catch(console.error);
