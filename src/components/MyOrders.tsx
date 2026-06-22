import { useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useTxToast } from "./TxToastContext";
import { Loader2, X, Hash } from "lucide-react";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { unitsToNumber } from "../utils/tradingMath";
import {
  activeOrders,
  sortLimitOrdersByPriceTime,
  SubgraphLimitOrder,
  useSubgraphUserOrders,
} from "../utils/subgraph";

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
  const sortedOrders = useMemo(
    () => sortLimitOrdersByPriceTime(activeOrders(orders).filter((order) => BigInt(order.remaining) > 0n)),
    [orders],
  );

  const { data: collateralDecimalsRaw } = useReadContract({
    abi: ERC20_DECIMALS_ABI,
    address: collateralAddr as `0x${string}`,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

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
      refetchOrders();
    }
  }, [cancelTxHash, cancelSuccess]);

  useEffect(() => {
    if (cancelTxHash && cancelError) {
      console.error("[Cancel Tx Error]", cancelError);
      showError("Cancel transaction failed");
    }
  }, [cancelTxHash, cancelError]);

  const handleCancel = (orderId: bigint) => {
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
      <div className="empty-block" style={{ padding: 48 }}>
        <span className="empty-icon">🔌</span>
        <p className="empty-title">Connect wallet</p>
        <p className="empty-desc">Connect to view your orders in this market.</p>
      </div>
    );
  }

  if (ordersLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (sortedOrders.length === 0) {
    return (
      <div className="empty-block" style={{ padding: 48 }}>
        <span className="empty-icon">📝</span>
        <p className="empty-title">No active orders</p>
        <p className="empty-desc">Place a limit order in this market to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sortedOrders.map((order) => (
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
  const priceCents = Number(order.price) / 1e16;
  const amountShares = unitsToNumber(remaining, collateralDecimals).toFixed(2);

  const isFullyFilled = remaining === 0n;
  const isCancelled = order.status === "CANCELLED";
  const isCancellable = (order.status === "ACTIVE" || order.status === "PARTIALLY_FILLED") && remaining > 0n;

  return (
    <div className={`order-row ${order.isYes ? "yes" : "no"}`} style={isCancelled ? { opacity: 0.55 } : undefined}>
      <div className="info">
        <span className={`chip ${order.isYes ? "chip-yes" : "chip-no"}`}>
          {order.isYes ? "YES" : "NO"}
        </span>
        <span className="price">{priceCents.toFixed(0)}¢</span>
        <span className="meta">
          <span className="shares">{amountShares}</span>
          <span style={{ fontSize: 10 }}>shares</span>
          {filledPct > 0 && <span className="badge-progress">{filledPct}%</span>}
          {isFullyFilled && <span className="badge-filled">Filled</span>}
          {isCancelled && <span className="badge-cancelled">Cancelled</span>}
        </span>
      </div>

      <div className="right">
        <span className="meta" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Hash size={10} strokeWidth={2.4} aria-hidden="true" />
          {order.orderId.slice(-4)}
        </span>
        {isCancellable && (
          <button
            type="button"
            onClick={() => onCancel(orderId)}
            disabled={disabled}
            className="cancel-btn"
          >
            {disabled ? (
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
            ) : (
              <X size={11} strokeWidth={2.4} aria-hidden="true" />
            )}
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
