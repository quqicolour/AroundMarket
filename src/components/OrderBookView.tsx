import React from "react";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { formatPrice } from "../utils/format";
import { cn } from "../utils/format";

interface Props {
  marketId: number;
  orderBookAddr: string;
}

export default function OrderBookView({ marketId, orderBookAddr }: Props) {
  const { data: bestBid } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestBid",
    args: [BigInt(marketId)],
  });

  const { data: bestAsk } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestAsk",
    args: [BigInt(marketId)],
  });

  const { data: allPrices } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getSortedPrices",
    args: [BigInt(marketId), true],
    query: { enabled: !!orderBookAddr },
  });

  const bidPrice = bestBid ? formatPrice(bestBid) : null;
  const askPrice = bestAsk ? formatPrice(bestAsk) : null;
  const spread =
    bidPrice && askPrice
      ? ((parseFloat(askPrice) - parseFloat(bidPrice)) * 100).toFixed(2)
      : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm">订单簿</h3>
        {spread && (
          <span className="text-xs text-gray-500">价差 {spread}%</span>
        )}
      </div>

      <div className="p-4">
        {/* Best Bid/Ask Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-900/15 border border-green-800/20 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              最佳买家 (BID)
            </div>
            <div className="text-lg font-mono font-semibold text-green-400">
              {bidPrice ? `${(parseFloat(bidPrice) * 100).toFixed(1)}%` : "—"}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              {bidPrice ?? "—"}
            </div>
          </div>

          <div className="bg-red-900/15 border border-red-800/20 rounded-lg p-3">
            <div className="text-xs text-red-400 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              最佳卖家 (ASK)
            </div>
            <div className="text-lg font-mono font-semibold text-red-400">
              {askPrice ? `${(parseFloat(askPrice) * 100).toFixed(1)}%` : "—"}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              {askPrice ?? "—"}
            </div>
          </div>
        </div>

        {/* Price Ladder */}
        {allPrices && (allPrices as bigint[]).length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-2">价格深度</div>
            {(allPrices as bigint[]).slice(0, 8).map((price, i) => {
              const pct = (parseFloat(formatPrice(price)) * 100).toFixed(1);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-500 font-mono">{pct}%</span>
                  <div className="flex-1 h-4 bg-violet-500/20 rounded-sm relative overflow-hidden">
                    <div
                      className="absolute right-0 h-full bg-violet-500/40 rounded-sm"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            暂无订单簿数据
          </div>
        )}
      </div>
    </div>
  );
}
