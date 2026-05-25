import React from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "../config/contracts";
import ConditionalTokensABI from "../abis/ConditionalTokens.json";
import SettlementManagerABI from "../abis/SettlementManager.json";
import { formatAmount } from "../utils/format";

export default function MyPositions() {
  const { address, isConnected } = useAccount();

  const { data: marketCount } = useReadContract({
    abi: (require("../abis/PredictionMarketFactory.json") as any).abi,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarketCount",
  });

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h3 className="text-xl font-semibold mb-2">连接钱包</h3>
        <p className="text-gray-400">请先连接钱包查看您的仓位</p>
      </div>
    );
  }

  const count = Number(marketCount ?? 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
        我的仓位
      </h2>

      {count === 0 ? (
        <div className="bg-gray-900 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">暂无仓位</h3>
          <p className="text-gray-400">去市场进行交易吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: count }, (_, i) => (
            <PositionCard key={i + 1} marketId={i + 1} address={address!} />
          ))}
        </div>
      )}
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
    abi: (require("../abis/PredictionMarketFactory.json") as any).abi,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(marketId)],
  });

  if (!marketData) return null;

  const conditionId = marketData[4];
  const resolved = marketData[5];

  const yesBalance = useReadContract({
    abi: (ConditionalTokensABI as any).abi,
    address: CONTRACTS.ConditionalTokens,
    functionName: "balanceOf",
    args: [address, conditionId, 0n],
  });

  const noBalance = useReadContract({
    abi: (ConditionalTokensABI as any).abi,
    address: CONTRACTS.ConditionalTokens,
    functionName: "balanceOf",
    args: [address, conditionId, 1n],
  });

  const yesAmt = yesBalance.data ? formatAmount(yesBalance.data) : "0";
  const noAmt = noBalance.data ? formatAmount(noBalance.data) : "0";
  const hasPosition = parseFloat(yesAmt) > 0 || parseFloat(noAmt) > 0;

  if (!hasPosition) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-violet-400 font-mono">
          市场 #{marketId}
        </span>
        {resolved && (
          <span className="text-xs px-2 py-1 rounded bg-green-900 text-green-400">
            已结算
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
          <div className="text-xs text-green-400 mb-1">YES 持仓</div>
          <div className="text-lg font-mono text-green-400">{yesAmt}</div>
        </div>
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
          <div className="text-xs text-red-400 mb-1">NO 持仓</div>
          <div className="text-lg font-mono text-red-400">{noAmt}</div>
        </div>
      </div>
    </div>
  );
}
