import { useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { CONDITIONAL_TOKENS_POSITION_ABI, ERC20_BALANCE_ABI, ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { useTxToast } from "./TxToastContext";
import { Loader2, Download, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAmount } from "../utils/format";

interface MarketSummary {
 marketId: number;
 marketAddr: string;
 collateral: string;
 conditionId: string;
 resolved: boolean;
}

interface Props {
 markets: MarketSummary[];
}

// ConditionalTokens positionId 计算约定（CTF 标准）：
// positionId = getPositionId(collateralToken, collectionId)
// collectionId = bytes32(keccak256(parentCollectionId, conditionId, indexSet))
// indexSet =1 << outcomeIndex (outcome0=1, outcome1=2)
//简化：直接用 CTF提供的 balanceOf 重载 (holder, conditionId, outcomeIndex)，
// 不需要自己算 positionId。
export default function MyPositions({ markets }: Props) {
 const { address, isConnected } = useAccount();
 const { showPending, showSuccess, showError } = useTxToast();

 // USDC余额
 const usdcBalance = useReadContracts({
 contracts: [
 {
 address: CONTRACTS.Collateral as `0x${string}`,
 abi: ERC20_BALANCE_ABI,
 functionName: "balanceOf",
  args: [address as `0x${string}`],
  },
  {
  address: CONTRACTS.Collateral as `0x${string}`,
  abi: ERC20_DECIMALS_ABI,
  functionName: "decimals",
  },
  ],
  query: { enabled: !!address },
  });

 // 对每个 market: YES仓位 + NO仓位 + 可提取金额
 const perMarketCalls: any[] = markets.flatMap(m => [
 // YES仓位 (outcomeIndex=0)
 {
 address: CONTRACTS.ConditionalTokens as `0x${string}`,
 abi: CONDITIONAL_TOKENS_POSITION_ABI,
 functionName: "balanceOf",
 args: [address as `0x${string}`, m.conditionId as `0x${string}`,0n],
 },
 // NO仓位 (outcomeIndex=1)
 {
 address: CONTRACTS.ConditionalTokens as `0x${string}`,
 abi: CONDITIONAL_TOKENS_POSITION_ABI,
 functionName: "balanceOf",
 args: [address as `0x${string}`, m.conditionId as `0x${string}`,1n],
 },
 // 可提取金额
 {
 address: CONTRACTS.SettlementManager as `0x${string}`,
 abi: ABIs.SettlementManager,
 functionName: "computePayout",
  args: [address as `0x${string}`, BigInt(m.marketId)],
  },
  // 抵押物精度
  {
  address: m.collateral as `0x${string}`,
  abi: ERC20_DECIMALS_ABI,
  functionName: "decimals",
  },
]);

 const positionsRead = useReadContracts({
 contracts: perMarketCalls as any,
 query: { enabled: !!address && markets.length >0 },
 });

 //提取按钮
 const { writeContract: writeRedeem, data: redeemTxHash, isPending: redeemPending } = useWriteContract();
 const { isLoading: redeemConfirming, isSuccess: redeemSuccess, isError: redeemError } = useWaitForTransactionReceipt({ hash: redeemTxHash });

 useEffect(() => {
 if (redeemTxHash && redeemConfirming) showPending(redeemTxHash, "Redeem winnings");
 }, [redeemTxHash, redeemConfirming]);

 useEffect(() => {
 if (!redeemTxHash || !redeemSuccess) return;
 showSuccess("Redeemed", redeemTxHash);
 positionsRead.refetch();
 usdcBalance.refetch();
 }, [redeemTxHash, redeemSuccess]);

 useEffect(() => {
 if (redeemTxHash && redeemError) showError("Redeem failed");
 }, [redeemTxHash, redeemError]);

 const handleRedeem = (marketId: number) => {
 if (!address) return;
 writeRedeem({
 address: CONTRACTS.SettlementManager as `0x${string}`,
 abi: ABIs.SettlementManager,
 functionName: "redeemForUser",
 args: [address as `0x${string}`, BigInt(marketId)],
 });
 };

 if (!isConnected) {
 return (
 <div className="text-center py-16 text-gray-400">
 <p>Connect wallet to view your positions</p>
 </div>
 );
 }

 const usdcAmt = (usdcBalance.data?.[0]?.result as bigint | undefined) ??0n;
 const collateralDecimals = Number((usdcBalance.data?.[1]?.result as number | undefined) ??18);
 const usdcDisplay = formatAmount(usdcAmt, collateralDecimals);

 return (
 <div className="space-y-4">
 {/* USDC Balance Header */}
 <div className="bg-white rounded-2xl p-5 border border-gray-200">
 <div className="flex items-center gap-2 mb-1">
 <Wallet size={14} className="text-gray-400" />
 <p className="text-sm text-gray-500">USDC Balance</p>
 </div>
 <p className="text-2xl font-bold text-emerald-600 font-mono">
 {usdcDisplay} USDC
 </p>
 </div>

 {/* Per-market positions */}
 {markets.length ===0 ? (
 <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
 <p className="text-gray-400 text-sm">No markets available</p>
 </div>
 ) : (
 <div className="space-y-3">
 {markets.map((m, i) => {
  const yesBal = (positionsRead.data?.[i *4]?.result as bigint | undefined) ??0n;
  const noBal = (positionsRead.data?.[i *4 +1]?.result as bigint | undefined) ??0n;
  const payout = (positionsRead.data?.[i *4 +2]?.result as bigint | undefined) ??0n;
  const marketCollateralDecimals = Number((positionsRead.data?.[i *4 +3]?.result as number | undefined) ??18);
  const yesDisplay = Number(yesBal) /1e18;
  const noDisplay = Number(noBal) /1e18;
  const payoutDisplay = formatAmount(payout, marketCollateralDecimals);
 const isLoading = positionsRead.isLoading;
 const hasPosition = yesBal >0n || noBal >0n;
 const canRedeem = m.resolved && payout >0n;

 if (!hasPosition && !canRedeem) return null;

 return (
 <div key={m.marketId} className="bg-white rounded-2xl p-4 border border-gray-200">
 <div className="flex items-center justify-between mb-3">
 <Link to={`/market/${m.marketId}`} className="text-sm font-semibold text-gray-700 hover:underline">
 Market #{m.marketId}
 {m.resolved && (
 <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
 Resolved
 </span>
 )}
 </Link>
 </div>
 <div className="grid grid-cols-2 gap-3 mb-3">
 <PositionRow label="YES" balance={yesDisplay} loading={isLoading} />
 <PositionRow label="NO" balance={noDisplay} loading={isLoading} />
 </div>
 {canRedeem && (
 <button
 type="button"
 onClick={() => handleRedeem(m.marketId)}
 disabled={redeemPending || redeemConfirming}
 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
 style={{
 background: redeemPending || redeemConfirming ? "var(--text-tertiary)" : "var(--yes)",
 color: "white",
 cursor: redeemPending || redeemConfirming ? "not-allowed" : "pointer",
 opacity: redeemPending || redeemConfirming ?0.6 :1,
 }}
 >
 {redeemPending || redeemConfirming ? (
 <><Loader2 size={14} style={{ animation: "spin1s linear infinite" }} /> Redeeming...</>
 ) : (
 <><Download size={14} /> Redeem {payoutDisplay} USDC</>
 )}
 </button>
 )}
 </div>
 );
 })}
 {markets.every((_, i) => {
  const yesBal = (positionsRead.data?.[i *4]?.result as bigint | undefined) ??0n;
  const noBal = (positionsRead.data?.[i *4 +1]?.result as bigint | undefined) ??0n;
  const payout = (positionsRead.data?.[i *4 +2]?.result as bigint | undefined) ??0n;
 return yesBal ===0n && noBal ===0n && payout ===0n;
 }) && !positionsRead.isLoading && (
 <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
 <p className="text-gray-400 text-sm">No positions yet — trade to get started</p>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

function PositionRow({ label, balance, loading }: { label: string; balance: number; loading: boolean }) {
 const colorClass = label === "YES" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-rose-700 bg-rose-50 border-rose-100";
 return (
 <div className={`rounded-lg border p-3 ${colorClass}`}>
 <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
 <p className="text-lg font-bold font-mono">
 {loading ? "..." : balance.toFixed(2)}
 </p>
 </div>
 );
}
