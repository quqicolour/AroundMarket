import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useTxToast } from "./TxToastContext";
import { Loader2, X, Hash } from "lucide-react";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { unitsToNumber } from "../utils/tradingMath";
import { SubgraphLimitOrder, useSubgraphUserOrders } from "../utils/subgraph";

interface Props {
 marketAddr: string;
 marketId: number;
 collateralAddr: string;
}

// OrderData struct from ABI: id, marketId, maker, isYes, price, amount, filled, timestamp, isActive
// 合约语义: amount = CTF shares with collateral decimals, price = 1e18
export default function MyOrders({ marketAddr, marketId, collateralAddr }: Props) {
 const { address, isConnected } = useAccount();
 const { showPending, showSuccess, showError } = useTxToast();

 const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useSubgraphUserOrders(marketId, address);

  const { data: collateralDecimalsRaw } = useReadContract({
  abi: ERC20_DECIMALS_ABI,
  address: collateralAddr as `0x${string}`,
  functionName: "decimals",
  query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ??18);

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

 if (ordersLoading) {
 return (
 <div className="space-y-2">
 {[1, 2, 3].map(i => (
 <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
 ))}
 </div>
 );
 }

 if (orders.length === 0) {
 return (
 <div className="text-center py-16 text-gray-400">
 <div className="text-3xl mb-2 opacity-30">📝</div>
 <p className="text-sm">No orders in this market yet</p>
 </div>
 );
 }

 return (
 <div className="space-y-2">
 {orders.map((order) => (
 <MyOrderRow
 key={order.id}
 order={order}
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
 order,
 collateralDecimals,
 onCancel,
 disabled,
}: {
 order: SubgraphLimitOrder;
 collateralDecimals: number;
 onCancel: (id: bigint) => void;
 disabled: boolean;
}) {
  const orderId = BigInt(order.orderId);
  const amount = BigInt(order.amount);
  const filled = BigInt(order.filled);
  const remaining = BigInt(order.remaining);
  const filledPct = amount > 0n ? Number((filled * 100n) / amount) : 0;
  const priceCents = (Number(order.price) / 1e16); // 1e18 → cents
  const amountShares = unitsToNumber(remaining, collateralDecimals).toFixed(2);

 // 状态: active & 有剩余 → 可取消; filled=amount → 全部成交; !isActive → 已取消
 const isFullyFilled = remaining === 0n;
 const isCancelled = order.status === "CANCELLED";
 const isCancellable = (order.status === "ACTIVE" || order.status === "PARTIALLY_FILLED") && remaining > 0n;

 return (
 <div
 className="flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors"
 style={{
 background: order.isYes ? "rgba(16,185,129,0.04)" : "rgba(244,63,94,0.04)",
 borderColor: order.isYes ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
 opacity: isCancelled ? 0.55 : 1,
 }}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <span
 className={`text-xs font-bold px-2 py-0.5 rounded-md ${
 order.isYes ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
 }`}
 >
 {order.isYes ? "YES" : "NO"}
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
 {order.orderId.slice(-4)}
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
