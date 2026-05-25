import React from "react";
import { useAccount } from "wagmi";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "../abis";
import { formatPrice, formatAmount } from "../utils/format";
import { Loader2, X, AlertCircle } from "lucide-react";

interface OrderInfo {
  id: bigint;
  marketId: bigint;
  maker: string;
  isYes: boolean;
  price: bigint;
  amount: bigint;
  filled: bigint;
  timestamp: bigint;
  isActive: boolean;
}

interface Props {
  orderBookAddr: string;
  marketId: number;
  marketAddr: string;
}

function OrderRow({ order, orderBookAddr, marketAddr }: { order: OrderInfo; orderBookAddr: string; marketAddr: string }) {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCancel = () => {
    writeContract({
      abi: ABIs.Market,
      address: marketAddr as `0x${string}`,
      functionName: "cancelOrder",
      args: [order.id],
    });
  };

  const remaining = order.amount - order.filled;
  const filledPercent = Number(order.amount) > 0 
    ? (Number(order.filled) / Number(order.amount) * 100).toFixed(1)
    : "0";

  return (
    <div className="bg-gray-800/40 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            order.isYes 
              ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/40" 
              : "bg-red-900/40 text-red-400 border border-red-800/40"
          }`}>
            {order.isYes ? "YES" : "NO"}
          </span>
          <span className="text-xs text-gray-500 font-mono">#{Number(order.id)}</span>
        </div>
        <button
          onClick={handleCancel}
          disabled={isPending || isConfirming}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-50"
          title="取消订单"
        >
          {isPending || isConfirming ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
        </button>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500 mb-0.5">价格</div>
          <div className="text-gray-200 font-mono">{formatPrice(order.price)} USDC</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">数量</div>
          <div className="text-gray-200 font-mono">{formatAmount(order.amount)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">剩余</div>
          <div className="text-gray-200 font-mono">{formatAmount(remaining)}</div>
        </div>
      </div>

      {/* Fill Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>已成交</span>
          <span>{filledPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              order.isYes ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ width: `${filledPercent}%` }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} />
          {error.message?.slice(0, 60) ?? "取消失败"}
        </div>
      )}
    </div>
  );
}

export default function MyOrders({ orderBookAddr, marketId, marketAddr }: Props) {
  const { address, isConnected } = useAccount();

  // Get user's order IDs
  const { data: orderIds, isLoading: isLoadingIds } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getUserOrders",
    args: [address as `0x${string}`, BigInt(marketId)],
  });

  if (!isConnected) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-3">🔗</div>
        <div>连接钱包查看您的挂单</div>
      </div>
    );
  }

  if (isLoadingIds) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!orderIds || orderIds.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-3">📋</div>
        <div>暂无挂单</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderIds.map((orderId: bigint) => (
        <OrderDetailWithData 
          key={orderId.toString()} 
          orderId={orderId} 
          orderBookAddr={orderBookAddr}
          marketAddr={marketAddr}
        />
      ))}
    </div>
  );
}

// Fetch and render individual order
function OrderDetailWithData({ orderId, orderBookAddr, marketAddr }: { orderId: bigint; orderBookAddr: string; marketAddr: string }) {
  const { data: order, isLoading } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getOrder",
    args: [orderId],
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800/40 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }

  if (!order) return null;

  const orderInfo = order as any as OrderInfo;
  if (!orderInfo.isActive) return null;

  return (
    <OrderRow 
      order={orderInfo} 
      orderBookAddr={orderBookAddr}
      marketAddr={marketAddr}
    />
  );
}