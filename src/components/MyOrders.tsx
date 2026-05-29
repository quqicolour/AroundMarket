import { useAccount, useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { formatPrice, formatAmount } from "../utils/format";

interface OrderInfo {
  id: bigint;
  isYes: boolean;
  price: bigint;
  amount: bigint;
  filled: bigint;
  creator: string;
}

export default function MyOrders({ orderBookAddr }: { orderBookAddr: string }) {
  const { address, isConnected } = useAccount();

  const { data: rawOrders, isLoading } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getUserOrders",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Connect wallet to view your orders</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const orders = (rawOrders as OrderInfo[] | undefined) ?? [];

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No active orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {orders.map((order) => {
        const filledPct = order.amount > 0n ? Number((order.filled * 100n) / order.amount) : 0;
        return (
          <div key={String(order.id)} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${order.isYes ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {order.isYes ? "YES" : "NO"}
              </span>
              <span className="text-sm text-gray-700">{formatPrice(order.price)}¢</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{formatAmount(order.amount, 2)}</span>
              {filledPct > 0 && (
                <span className="text-xs text-gray-400">{filledPct}% filled</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
