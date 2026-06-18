import { useReadContract } from "wagmi";
import { formatPrice, formatAmount } from "../utils/format";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { useSubgraphMarketTrades } from "../utils/subgraph";

interface Props {
  marketId: number;
  matchingEngineAddr: string;
  collateralAddr: string;
}

export default function RecentTrades({ marketId, collateralAddr }: Props) {
  const { data: collateralDecimalsRaw } = useReadContract({
    abi: ERC20_DECIMALS_ABI,
    address: collateralAddr as `0x${string}`,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

  const { data: trades = [], isLoading } = useSubgraphMarketTrades(marketId);
  const latestTrades = trades.slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Recent Trades</h3>
        <span className="text-xs text-gray-400">{latestTrades.length} trades</span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="text-3xl opacity-30">📊</div>
          <p className="text-xs text-gray-400">No trade history</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {latestTrades.map((trade) => {
            const price = BigInt(trade.avgPrice);
            const shares = BigInt(trade.filled);
            const collateralAmount = BigInt(trade.collateralVolume);
            const time = new Date(Number(trade.blockTimestamp) * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={trade.id} className="flex items-center gap-3 px-5 py-2.5 text-xs hover:bg-gray-50/60 transition">
                <span className={`w-8 text-center text-xs font-semibold rounded-full py-0.5 ${trade.isYes ? "badge-yes" : "badge-no"}`}>
                  {trade.isYes ? "YES" : "NO"}
                </span>
                <span className="font-mono font-medium text-gray-800">{formatPrice(price)}</span>
                <span className="text-gray-400">·</span>
                <span className="font-mono text-gray-600">
                  {formatAmount(shares, collateralDecimals)} shares
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-mono text-gray-600">
                  {formatAmount(collateralAmount, collateralDecimals)} USDC
                </span>
                <span className="flex-1 text-right text-gray-400 font-mono">{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
