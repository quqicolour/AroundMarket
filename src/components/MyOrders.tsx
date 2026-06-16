import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "../abis";
import { useTxToast } from "./TxToastContext";
import { Loader2, X, Hash } from "lucide-react";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { unitsToNumber } from "../utils/tradingMath";

interface Props {
 orderBookAddr: string;
 marketAddr: string;
 marketId: number;
 collateralAddr: string;
}

// OrderData struct from ABI: id, marketId, maker, isYes, price, amount, filled, timestamp, isActive
// 合约语义: amount = CTF shares with collateral decimals, price = 1e18
export default function MyOrders({ orderBookAddr, marketAddr, marketId, collateralAddr }: Props) {
 const { address, isConnected } = useAccount();
 const { showPending, showSuccess, showError } = useTxToast();

 const { data: orderIds, isLoading: idsLoading, refetch: refetchOrders } = useReadContract({
 abi: ABIs.OrderBook,
 address: orderBookAddr as `0x${string}`,
 functionName: "getUserOrders",
 args: [address as `0x${string}`, BigInt(marketId)],
 query: { enabled: !!address && !!orderBookAddr },
 });

  const orderIdList = (orderIds as bigint[] | undefined) ?? [];
  const { data: collateralDecimalsRaw } = useReadContract({
  abi: ERC20_DECIMALS_ABI,
  address: collateralAddr as `0x${string}`,
  functionName: "decimals",
  query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ??18);

 console.log("[MyOrders]", {
 user: address,
 marketId,
 orderBookAddr,
 marketAddr,
 orderCount: orderIdList.length,
 orderIds: orderIdList.map(x => x.toString()),
 });

 // Cancel mutation
 const { writeContract: writeCancel, data: cancelTxHash, isPending: cancelPending, error: cancelWriteError } = useWriteContract();
 const { isLoading: cancelConfirming, isSuccess: cancelSuccess, isError: cancelError } = useWaitForTransactionReceipt({ hash: cancelTxHash });

 useEffect(() => {
 if (cancelWriteError) {
 console.error("[Cancel Write Error]", cancelWriteError);
 showError("Cancel rejected: " + ((cancelWriteError as any)?.shortMessage || (cancelWriteError as any)?.message || "unknown"));
 }
 }, [cancelWriteError]);

 useEffect(() => {
 if (cancelTxHash && cancelConfirming) showPending(cancelTxHash, "Cancel order");
 }, [cancelTxHash, cancelConfirming]);

 useEffect(() => {
 if (cancelTxHash && cancelSuccess) {
 showSuccess("Order cancelled", cancelTxHash);
 refetchOrders(); //刷新订单列表
 }
 }, [cancelTxHash, cancelSuccess]);

 useEffect(() => {
 if (cancelTxHash && cancelError) {
 console.error("[Cancel Tx Error]", cancelError);
 showError("Cancel transaction failed");
 }
 }, [cancelTxHash, cancelError]);

 const handleCancel = (orderId: bigint) => {
 //合约实际签名 cancelOrder(uint64[]) 数组（跟 ELFLAB 一致）
 // ABI 文件里写的是单数版,但实际链上合约只接受数组—用 inline ABI
 const cancelAbi = [
 {
 name: "cancelOrder",
 type: "function",
 stateMutability: "nonpayable",
 inputs: [{ name: "orderIds", type: "uint64[]" }],
 outputs: [],
 },
 ] as const;
 console.log("[Cancel Order] args:", {
 functionName: "cancelOrder",
 marketAddr,
 orderIds: [orderId.toString()],
 });
 writeCancel({
 abi: cancelAbi as any,
 address: marketAddr as `0x${string}`,
 functionName: "cancelOrder",
 args: [[orderId]],
 });
 };

 if (!isConnected) {
 return (
 <div className="text-center py-16 text-gray-400">
 <p>Connect wallet to view your orders</p>
 </div>
 );
 }

 if (idsLoading) {
 return (
 <div className="space-y-2">
 {[1, 2, 3].map(i => (
 <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
 ))}
 </div>
 );
 }

 if (orderIdList.length === 0) {
 return (
 <div className="text-center py-16 text-gray-400">
 <div className="text-3xl mb-2 opacity-30">📝</div>
 <p className="text-sm">No orders in this market yet</p>
 </div>
 );
 }

 return (
 <div className="space-y-2">
 {orderIdList.map((oid) => (
 <MyOrderRow
 key={String(oid)}
 orderId={oid}
 orderBookAddr={orderBookAddr}
  marketId={marketId}
  collateralDecimals={collateralDecimals}
  onCancel={handleCancel}
 disabled={cancelPending || cancelConfirming}
/>
 ))}
 </div>
 );
}

// ── Single Order Row ──────────────────────────────────────────────────────────
function MyOrderRow({
 orderId,
 orderBookAddr,
 collateralDecimals,
 onCancel,
 disabled,
}: {
 orderId: bigint;
 orderBookAddr: string;
 marketId: number;
 collateralDecimals: number;
 onCancel: (id: bigint) => void;
 disabled: boolean;
}) {
 const { data: order, isLoading } = useReadContract({
 abi: ABIs.OrderBook,
 address: orderBookAddr as `0x${string}`,
 functionName: "getOrder",
 args: [orderId],
 query: { enabled: !!orderBookAddr },
 });

 if (isLoading || !order) {
 return <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />;
 }

 const o = order as {
 id: bigint;
 maker: string;
 isYes: boolean;
 price: bigint;
 amount: bigint;
 filled: bigint;
 timestamp: bigint;
 isActive: boolean;
 };

  const remaining = o.amount > 0n ? o.amount - o.filled : 0n;
  const filledPct = o.amount > 0n ? Number((o.filled * 100n) / o.amount) : 0;
  const priceCents = (Number(o.price) / 1e16); // 1e18 → cents
  const amountShares = unitsToNumber(remaining, collateralDecimals).toFixed(2);

 // 状态: active & 有剩余 → 可取消; filled=amount → 全部成交; !isActive → 已取消
 const isFullyFilled = remaining === 0n;
 const isCancelled = !o.isActive;
 const isCancellable = o.isActive && remaining > 0n;

 return (
 <div
 className="flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors"
 style={{
 background: o.isYes ? "rgba(16,185,129,0.04)" : "rgba(244,63,94,0.04)",
 borderColor: o.isYes ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
 opacity: isCancelled ? 0.55 : 1,
 }}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <span
 className={`text-xs font-bold px-2 py-0.5 rounded-md ${
 o.isYes ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
 }`}
 >
 {o.isYes ? "YES" : "NO"}
 </span>
 <span className="text-sm font-mono font-semibold text-gray-800">
 {priceCents.toFixed(0)}¢
 </span>
 <span className="text-gray-400 text-xs">×</span>
 <span className="text-sm font-mono text-gray-700">{amountShares}</span>
 <span className="text-[10px] text-gray-400 font-medium">shares</span>
 {filledPct > 0 && (
 <span className="text-[10px] text-gray-500 font-medium px-1.5 py-0.5 rounded bg-gray-100">
 {filledPct}% filled
 </span>
 )}
 {isFullyFilled && (
 <span className="text-[10px] text-blue-600 font-semibold px-1.5 py-0.5 rounded bg-blue-50">
 FILLED
 </span>
 )}
 {isCancelled && (
 <span className="text-[10px] text-gray-500 font-semibold px-1.5 py-0.5 rounded bg-gray-100 line-through">
 CANCELLED
 </span>
 )}
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
 <Hash size={9} />
 {String(o.id).slice(-4)}
 </span>
 {isCancellable && (
 <button
 type="button"
 onClick={() => onCancel(orderId)}
 disabled={disabled}
 className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 style={{
 background: "transparent",
 color: "var(--text-secondary)",
 border: "1px solid var(--border)",
 cursor: disabled ? "not-allowed" : "pointer",
 }}
 onMouseEnter={e => {
 if (disabled) return;
 e.currentTarget.style.background = "rgba(244,63,94,0.1)";
 e.currentTarget.style.color = "rgb(244,63,94)";
 e.currentTarget.style.borderColor = "rgba(244,63,94,0.3)";
 }}
 onMouseLeave={e => {
 e.currentTarget.style.background = "transparent";
 e.currentTarget.style.color = "var(--text-secondary)";
 e.currentTarget.style.borderColor = "var(--border)";
 }}
 >
 {disabled ? (
 <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
 ) : (
 <X size={11} />
 )}
 Cancel
 </button>
 )}
 </div>
 </div>
 );
}
