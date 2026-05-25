import React from "react";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatPrice, formatAmount, formatAddress } from "../utils/format";
import { cn } from "../utils/format";
import { useState } from "react";

interface Props {
  marketId: number;
}

interface MarketData {
  collateral: string;
  conditionTokens: string;
  orderBook: string;
  matchingEngine: string;
  conditionId: string;
  resolved: boolean;
  fee: bigint;
}

export default function MarketCard({ marketId }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data: exists, isLoading: existsLoading } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "marketExists",
    args: [BigInt(marketId)],
  });

  const { data: rawMarketData, isLoading } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(marketId)],
    query: { enabled: !!exists },
  });

  // Cast to MarketData shape
  const marketData = rawMarketData as MarketData | undefined;

  const orderBookAddr = marketData?.orderBook;

  const { data: bestBid } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr,
    functionName: "getBestBid",
    args: [BigInt(marketId)],
    query: { enabled: !!orderBookAddr && !!exists },
  });

  const { data: bestAsk } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr,
    functionName: "getBestAsk",
    args: [BigInt(marketId)],
    query: { enabled: !!orderBookAddr && !!exists },
  });

  if (existsLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-3 bg-gray-800 rounded w-1/3 mb-3"></div>
        <div className="h-5 bg-gray-800 rounded w-2/3 mb-4"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Market doesn't exist
  if (!exists) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-3 bg-gray-800 rounded w-1/3 mb-3"></div>
        <div className="h-5 bg-gray-800 rounded w-2/3 mb-4"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const resolved = marketData?.resolved ?? false;
  // getBestBid/getBestAsk return uint128 in basis points (e.g., 5000 = 50%)
  const yesPct = bestBid ? `${(Number(bestBid) / 100).toFixed(1)}%` : "—";
  const noPct = bestAsk ? `${(Number(bestAsk) / 100).toFixed(1)}%` : "—";

  return (
    <div
      className={cn(
        "market-card bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer",
        expanded && "ring-1 ring-violet-500/50"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-violet-400">
              #{marketId}
            </span>
            {resolved && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                已结算
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-100">预测市场 #{marketId}</h3>
        </div>
        <div className="text-2xl">📊</div>
      </div>

      {/* Price Section */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-sm text-gray-400">YES</span>
          </div>
          <span
            className={cn(
              "font-mono font-semibold text-sm",
              bestBid ? "text-green-400" : "text-gray-500"
            )}
          >
            {yesPct}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span className="text-sm text-gray-400">NO</span>
          </div>
          <span
            className={cn(
              "font-mono font-semibold text-sm",
              bestAsk ? "text-red-400" : "text-gray-500"
            )}
          >
            {noPct}
          </span>
        </div>
      </div>

      {/* Order Book Depth Bar */}
      <div className="mb-4">
        <div className="price-bar opacity-60"></div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Expanded: Market Details */}
      {expanded && marketData && (
        <div className="pt-4 border-t border-gray-800 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">抵押品</span>
            <span className="text-gray-400 font-mono">
              {formatAddress(marketData.collateral, 6)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">订单簿</span>
            <span className="text-gray-400 font-mono">
              {formatAddress(marketData.orderBook, 6)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">条件ID</span>
            <span className="text-gray-400 font-mono">
              {formatAddress(marketData.conditionId, 6)}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="pt-3 border-t border-gray-800 text-center">
        <span className="text-sm text-violet-400 hover:text-violet-300 transition">
          {expanded ? "收起 ▲" : "交易 →"}
        </span>
      </div>
    </div>
  );
}