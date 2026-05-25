import React from "react";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import MarketCard from "../components/MarketCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import EmptyState from "../components/EmptyState";

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-0.5 h-5 bg-violet-500 rounded-full"></span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
    </div>
  );
}

export default function HomePage() {
  // Use nextMarketId to get actual count — it's the next ID to be assigned,
  // so nextMarketId - 1 = last created market ID. This is more reliable than getMarketCount.
  const { data: nextMarketId, isLoading: countLoading } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "nextMarketId",
  });

  const marketCount = Number(nextMarketId ?? 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/20 via-gray-900 to-fuchsia-900/20 border border-violet-800/20 p-8 md:p-12">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            去中心化预测市场
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mb-6">
            基于 Base Sepolia 的二元预测市场合约，支持任意主题的 YES/NO 交易
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Base Sepolia 测试网
            </span>
            <span>·</span>
            <span>{marketCount} 个市场</span>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </section>

      {/* Markets Grid */}
      <section>
        <SectionHeader title="活跃市场" subtitle={`共 ${marketCount} 个`} />
        {countLoading ? (
          <LoadingSkeleton count={6} />
        ) : marketCount === 0 ? (
          <EmptyState
            emoji="🔮"
            title="暂无市场"
            desc="成为第一个创建预测市场的人"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: marketCount }, (_, i) => (
              <MarketCard key={i} marketId={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}