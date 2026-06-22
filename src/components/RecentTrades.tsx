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
    <div className="card list-card">
      <div className="list-card-head">
        <h3>Recent Trades</h3>
        <span className="meta">{latestTrades.length} trades</span>
      </div>

      {isLoading ? (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 30, borderRadius: 8 }} />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="empty-block" style={{ padding: 36 }}>
          <span className="empty-icon">📊</span>
          <p className="empty-desc">No trade history</p>
        </div>
      ) : (
        <div>
          {latestTrades.map((trade) => {
            const price = BigInt(trade.avgPrice);
            const shares = BigInt(trade.filled);
            const collateralAmount = BigInt(trade.collateralVolume);
            const time = new Date(Number(trade.blockTimestamp) * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            return (
              <div key={trade.id} className="list-row">
                <span className={`chip ${trade.isYes ? "chip-yes" : "chip-no"}`}>
                  {trade.isYes ? "YES" : "NO"}
                </span>
                <span className="price">{formatPrice(price)}</span>
                <span className="amount">{formatAmount(shares, collateralDecimals)} <span className="subtle" style={{ fontSize: 10 }}>shares</span></span>
                <span className="amount">{formatAmount(collateralAmount, collateralDecimals)} <span className="subtle" style={{ fontSize: 10 }}>USDC</span></span>
                <span className="time">{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
