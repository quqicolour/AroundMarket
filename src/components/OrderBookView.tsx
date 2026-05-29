import { useReadContract } from "wagmi";
import { ABIs } from "../abis";

interface Props {
  marketId: number;
  orderBookAddr: string;
}

function pct(price: bigint): number {
  return Number(price) / 100;
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

  const bidVal = bestBid ? pct(bestBid as bigint) : null;
  const askVal = bestAsk ? pct(bestAsk as bigint) : null;
  const spread = bidVal && askVal ? (askVal - bidVal).toFixed(2) : null;

  const prices = (allPrices as bigint[] | undefined) ?? [];
  const maxPrice = prices.length > 0 ? Math.max(...prices.map(p => Number(p) / 100)) : 100;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <BidAskCard label="BID" pct={bidVal} color="yes" />
        <BidAskCard label="ASK" pct={askVal} color="no" />
      </div>

      {spread && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>Spread</span>
          <span className="font-mono font-medium text-gray-600">{spread}%</span>
        </div>
      )}

      {prices.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Price Depth</p>
          <div className="space-y-1">
            {prices.slice(0, 8).map((price, i) => {
              const p = Number(price) / 100;
              const width = maxPrice > 0 ? (p / maxPrice) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-right font-mono text-gray-500">{p.toFixed(0)}%</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-sm relative overflow-hidden">
                    <div
                      className="absolute right-0 h-full depth-bar-yes rounded-sm transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-3xl mb-2 opacity-30">📋</div>
          <p className="text-xs text-gray-400">No order book data</p>
        </div>
      )}
    </div>
  );
}

function BidAskCard({ label, pct, color }: { label: string; pct: number | null; color: "yes" | "no" }) {
  return (
    <div className={`rounded-xl p-4 border ${color === "yes" ? "bg-emerald-50/70 border-emerald-100" : "bg-rose-50/70 border-rose-100"}`}>
      <div className={`text-xs font-medium mb-1 flex items-center gap-1.5 ${color === "yes" ? "text-emerald-600" : "text-rose-500"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${color === "yes" ? "bg-emerald-500" : "bg-rose-400"}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${color === "yes" ? "text-emerald-700" : "text-rose-600"}`}>
        {pct !== null ? `${pct.toFixed(0)}%` : "—"}
      </div>
      {pct !== null && (
        <div className="text-xs text-gray-400 font-mono mt-0.5">${(pct / 100).toFixed(4)}</div>
      )}
    </div>
  );
}
