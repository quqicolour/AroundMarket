import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatPrice, formatAmount, formatAddress } from "../utils/format";
import { cn } from "../utils/format";
import TradingForm from "../components/TradingForm";
import OrderBookView from "../components/OrderBookView";
import RecentTrades from "../components/RecentTrades";
import MyOrders from "../components/MyOrders";

type TabType = "trade" | "orderbook" | "myorders";

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const id = Number(marketId ?? 1);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [activeTab, setActiveTab] = useState<TabType>("trade");
  const { data: marketData, isLoading } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  if (isLoading) {
    return <MarketDetailSkeleton />;
  }

  if (!marketData) {
    return (
      <div className="text-center py-20 text-gray-400">市场 #{id} 不存在</div>
    );
  }

  const marketDataTuple = marketData as any;
  
  // Parse market data according to the struct:
  // MarketData { collateral, conditionTokens, orderBook, matchingEngine, conditionId, resolved, fee }
  const collateral = marketDataTuple[0] as string;
  const conditionTokens = marketDataTuple[1] as string;
  const orderBookAddr = marketDataTuple[2] as string;
  const matchingEngineAddr = marketDataTuple[3] as string;
  const conditionId = marketDataTuple[4] as string;
  const resolved = marketDataTuple[5] as boolean;
  const fee = marketDataTuple[6] as bigint;

  // matchingEngine IS the market clone address for placeOrder/cancelOrder/fillOrder
  const marketCloneAddr = matchingEngineAddr;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Market Info + Tabs */}
      <div className="lg:col-span-2 space-y-4">
        {/* Market Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-violet-400">
                  市场 #{id}
                </span>
                {resolved && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                    已结算
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold">预测市场 #{id}</h1>
            </div>
            <div className="text-3xl">📊</div>
          </div>

          {/* Market Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <DetailItem label="抵押品" value={formatAddress(collateral)} />
            <DetailItem label="订单簿" value={formatAddress(orderBookAddr)} />
            <DetailItem
              label="市场地址"
              value={formatAddress(marketCloneAddr, 6)}
            />
            <DetailItem
              label="条件ID"
              value={formatAddress(conditionId, 8)}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab("trade")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition",
                activeTab === "trade"
                  ? "text-white border-b-2 border-violet-500 bg-gray-800/30"
                  : "text-gray-500 hover:text-white"
              )}
            >
              交易
            </button>
            <button
              onClick={() => setActiveTab("orderbook")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition",
                activeTab === "orderbook"
                  ? "text-white border-b-2 border-violet-500 bg-gray-800/30"
                  : "text-gray-500 hover:text-white"
              )}
            >
              订单簿
            </button>
            <button
              onClick={() => setActiveTab("myorders")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition",
                activeTab === "myorders"
                  ? "text-white border-b-2 border-violet-500 bg-gray-800/30"
                  : "text-gray-500 hover:text-white"
              )}
            >
              我的挂单
            </button>
          </div>

          <div className="p-4">
            {activeTab === "trade" && (
              <div className="text-sm text-gray-400">
                在右侧表单进行交易
              </div>
            )}
            {activeTab === "orderbook" && (
              <OrderBookView marketId={id} orderBookAddr={orderBookAddr} />
            )}
            {activeTab === "myorders" && (
              <MyOrders 
                orderBookAddr={orderBookAddr} 
                marketId={id}
                marketAddr={marketCloneAddr}
              />
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <RecentTrades marketId={id} matchingEngineAddr={matchingEngineAddr} />
      </div>

      {/* Right: Trading Panel */}
      <div className="space-y-4">
        <TradingForm
          marketId={id}
          marketData={marketDataTuple}
          initialSide={side}
          onSideChange={setSide}
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/40 rounded-lg p-3">
      <div className="text-gray-500 mb-0.5">{label}</div>
      <div className="text-gray-300 font-mono text-sm">{value}</div>
    </div>
  );
}

function MarketDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
        <div className="h-40 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}