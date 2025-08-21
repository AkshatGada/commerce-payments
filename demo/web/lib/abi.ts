import { parseAbi } from 'viem';

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
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
  'function capture((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,uint16 feeBps,address feeReceiver) external',
  'function charge((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,address tokenCollector,bytes collectorData,uint16 feeBps,address feeReceiver) external',
  'function void((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo) external',
  'function reclaim((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo) external',
  'function refund((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,address tokenCollector,bytes collectorData) external',
  // State getter and hash utility
  'function paymentState(bytes32 paymentInfoHash) external view returns (bool hasCollectedPayment, uint120 capturableAmount, uint120 refundableAmount)',
  'function getHash((address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo) external view returns (bytes32)'
]);

export const ESCROW_EVENTS = parseAbi([
  'event PaymentAuthorized(bytes32 indexed paymentInfoHash,(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,address tokenCollector)',
  'event PaymentCaptured(bytes32 indexed paymentInfoHash,uint256 amount,uint16 feeBps,address feeReceiver)',
  'event PaymentCharged(bytes32 indexed paymentInfoHash,(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt) paymentInfo,uint256 amount,address tokenCollector,uint16 feeBps,address feeReceiver)',
  'event PaymentRefunded(bytes32 indexed paymentInfoHash,uint256 amount,address tokenCollector)',
  'event PaymentVoided(bytes32 indexed paymentInfoHash,uint256 amount)',
  'event PaymentReclaimed(bytes32 indexed paymentInfoHash,uint256 amount)'
]); 