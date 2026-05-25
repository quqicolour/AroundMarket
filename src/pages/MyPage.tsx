import React from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatAmount, formatAddress } from "../utils/format";
import { cn } from "../utils/format";
import EmptyState from "../components/EmptyState";

export default function MyPage() {
  const { address, isConnected } = useAccount();

  const { data: count } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarketCount",
  });

  const marketCount = Number(count ?? 0);

  if (!isConnected) {
    return (
      <EmptyState emoji="🔗" title="连接钱包" desc="请先连接钱包查看您的仓位" />
    );
  }

  if (marketCount === 0) {
    return <EmptyState emoji="📭" title="暂无仓位" desc="去市场进行交易吧" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-0.5 h-5 bg-violet-500 rounded-full"></span>
        <h2 className="text-lg font-semibold">我的仓位</h2>
      </div>

      <div className="space-y-3">
        {Array.from({ length: marketCount }, (_, i) => (
          <PositionCard key={i + 1} marketId={i + 1} address={address!} />
        ))}
      </div>
    </div>
  );
}

function PositionCard({
  marketId,
  address,
}: {
  marketId: number;
  address: string;
}) {
  const { data: marketData } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(marketId)],
  });

  if (!marketData) return null;

  const conditionId = marketData[4] as string;
  const resolved = marketData[5] as boolean;

  const { data: yesBal } = useReadContract({
    abi: ABIs.ConditionalTokens,
    address: CONTRACTS.ConditionalTokens,
    functionName: "balanceOf",
    args: [address, conditionId, 0n],
  });

  const { data: noBal } = useReadContract({
    abi: ABIs.ConditionalTokens,
    address: CONTRACTS.ConditionalTokens,
    functionName: "balanceOf",
    args: [address, conditionId, 1n],
  });

  const yesAmt = yesBal !== undefined ? formatAmount(yesBal) : "0";
  const noAmt = noBal !== undefined ? formatAmount(noBal) : "0";
  const hasPosition = parseFloat(yesAmt) > 0 || parseFloat(noAmt) > 0;

  if (!hasPosition) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-violet-400">
            市场 #{marketId}
          </span>
          {resolved && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
              已结算
            </span>
          )}
        </div>
        <a
          href={`/market/${marketId}`}
          className="text-xs text-violet-400 hover:text-violet-300 transition"
        >
          查看 →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* YES Position */}
        <div
          className={cn(
            "rounded-lg p-3 border",
            parseFloat(yesAmt) > 0
              ? "bg-green-900/20 border-green-800/30"
              : "bg-gray-800/30 border-gray-800/30",
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-xs text-green-400">YES 持仓</span>
          </div>
          <div className="text-lg font-mono font-semibold text-green-400">
            {yesAmt}
          </div>
        </div>

        {/* NO Position */}
        <div
          className={cn(
            "rounded-lg p-3 border",
            parseFloat(noAmt) > 0
              ? "bg-red-900/20 border-red-800/30"
              : "bg-gray-800/30 border-gray-800/30",
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
            <span className="text-xs text-red-400">NO 持仓</span>
          </div>
          <div className="text-lg font-mono font-semibold text-red-400">
            {noAmt}
          </div>
        </div>
      </div>
    </div>
  );
}
