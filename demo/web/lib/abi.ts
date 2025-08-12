import { parseAbi } from 'viem';

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
]);

export const PREAPPROVAL_ABI = parseAbi([
  'function preApprove((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo) external'
]);

export const ESCROW_ABI = parseAbi([
  'function getTokenStore(address operator) external view returns (address)',
  'function authorize((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,address tokenCollector,bytes collectorData) external',
  'function capture((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,uint16 feeBps,address feeReceiver) external'
]); 