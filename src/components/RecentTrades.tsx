import React from "react";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { formatPrice, formatAmount, formatAddress } from "../utils/format";
import { cn } from "../utils/format";

interface Props {
  marketId: number;
  matchingEngineAddr: string;
}

export default function RecentTrades({ marketId, matchingEngineAddr }: Props) {
  const { data: trades } = useReadContract({
    abi: ABIs.MatchingEngine,
    address: matchingEngineAddr as `0x${string}`,
    functionName: "getRecentTrades",
    args: [BigInt(marketId), 0n, 10n],
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-sm">最近成交</h3>
      </div>

      <div className="divide-y divide-gray-800/60">
        {trades && (trades as any[]).length > 0 ? (
          (trades as any[]).slice(0, 10).map((trade: any, i: number) => {
            const price = formatPrice(trade[3] ?? trade.price);
            const amount = formatAmount(trade[4] ?? trade.amount);
            const isYes = trade[2] ?? trade.isYes;
            return (
              <div
                key={i}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs font-mono",
                      isYes ? "text-green-400" : "text-red-400",
                    )}
                  >
                    {isYes ? "YES" : "NO"}
                  </span>
                  <span className="font-mono text-gray-300">{price}</span>
                  <span className="text-xs text-gray-500">{amount} CTF</span>
                </div>
                <span className="text-xs text-gray-600 font-mono">
                  {formatAddress(trade[1] ?? trade.taker ?? "", 4)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            暂无成交记录
          </div>
        )}
      </div>
    </div>
  );
}
