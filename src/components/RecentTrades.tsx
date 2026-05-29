import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { formatPrice, formatAmount } from "../utils/format";

interface Props {
  marketId: number;
  matchingEngineAddr: string;
}

interface Trade {
  isYes: boolean;
  price: bigint;
  amount: bigint;
  timestamp: bigint;
  taker: string;
}

export default function RecentTrades({ marketId, matchingEngineAddr }: Props) {
  const { data: tradesData, isLoading } = useReadContract({
    abi: ABIs.MatchingEngine,
    address: matchingEngineAddr as `0x${string}`,
    functionName: "getRecentTrades",
    args: [BigInt(marketId), 20n],
    query: { enabled: !!matchingEngineAddr },
  });

  const trades = (tradesData as any[] | undefined) ?? [];

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Recent Trades</h3>
        <span className="text-xs text-gray-400">{trades.length} trades</span>
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
          {trades.slice(0, 15).map((trade: any, i: number) => {
            const t: Trade = {
              isYes: trade[0] as boolean,
              price: trade[1] as bigint,
              amount: trade[2] as bigint,
              timestamp: trade[3] as bigint,
              taker: trade[4] as string,
            };
            const time = new Date(Number(t.timestamp) * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-xs hover:bg-gray-50/60 transition">
                <span className={`w-8 text-center text-xs font-semibold rounded-full py-0.5 ${t.isYes ? "badge-yes" : "badge-no"}`}>
                  {t.isYes ? "YES" : "NO"}
                </span>
                <span className="font-mono font-medium text-gray-800">{formatPrice(t.price)}</span>
                <span className="text-gray-400">×</span>
                <span className="font-mono text-gray-600">{formatAmount(t.amount)}</span>
                <span className="flex-1 text-right text-gray-400 font-mono">{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
