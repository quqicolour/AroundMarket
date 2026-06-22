import { useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import {
  buildOutcomeOrderBookLevels,
  OrderBookLevel,
  Outcome,
  useSubgraphMarketOrders,
} from "../utils/subgraph";
import { unitsToNumber } from "../utils/tradingMath";

interface Props {
  marketId: number;
  collateralAddr: string;
}

interface DisplayLevel extends OrderBookLevel {
  shares: number;
  cumulativeShares: number;
  totalCollateral: number;
}

function priceToCents(price: bigint): number {
  return Number(price) / 1e16;
}
function amountToShares(amount: bigint, decimals: number): number {
  return unitsToNumber(amount, decimals);
}
function collateralTotal(depth: bigint, price: bigint, decimals: number): number {
  return unitsToNumber((depth * price) / 10n ** 18n, decimals);
}
function formatNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 10 && value > 0 ? fractionDigits : 0,
    maximumFractionDigits: fractionDigits,
  });
}
function buildDisplayLevels(rows: OrderBookLevel[], decimals: number): DisplayLevel[] {
  let cumulativeShares = 0;
  return rows.map((row) => {
    const shares = amountToShares(row.depth, decimals);
    cumulativeShares += shares;
    return {
      ...row,
      shares,
      cumulativeShares,
      totalCollateral: collateralTotal(row.depth, row.price, decimals),
    };
  });
}

export default function OrderBookView({ marketId, collateralAddr }: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>("YES");

  const { data: collateralDecimalsRaw } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_DECIMALS_ABI,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

  const { data: orders = [], isLoading } = useSubgraphMarketOrders(marketId);
  const { buyRows, sellRows } = useMemo(
    () => buildOutcomeOrderBookLevels(orders, selectedOutcome),
    [orders, selectedOutcome],
  );
  const buyLevels = useMemo(() => buildDisplayLevels(buyRows, collateralDecimals), [buyRows, collateralDecimals]);
  const sellLevels = useMemo(() => buildDisplayLevels(sellRows, collateralDecimals), [sellRows, collateralDecimals]);

  const maxCumulativeDepth = Math.max(
    ...buyLevels.map((row) => row.cumulativeShares),
    ...sellLevels.map((row) => row.cumulativeShares),
    1,
  );
  const bestBuy = buyRows[0]?.price ?? 0n;
  const bestSell = sellRows[0]?.price ?? 0n;
  const spread = bestBuy > 0n && bestSell > 0n ? priceToCents(bestSell) - priceToCents(bestBuy) : null;

  if (isLoading) {
    return (
      <div className="orderbook-shell">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 32, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (buyLevels.length === 0 && sellLevels.length === 0) {
    return (
      <div className="orderbook-empty">
        <strong>No orders yet</strong>
        <span>Place a limit order to create the first price level.</span>
      </div>
    );
  }

  return (
    <div className="orderbook-shell">
      <div className="segmented" role="tablist" aria-label="Order book outcome" style={{ maxWidth: 320 }}>
        {(["YES", "NO"] as const).map((outcome) => (
          <button
            key={outcome}
            type="button"
            role="tab"
            aria-selected={selectedOutcome === outcome}
            className={`seg-item ${selectedOutcome === outcome ? "active" : ""}`}
            onClick={() => setSelectedOutcome(outcome)}
          >
            {outcome}
          </button>
        ))}
      </div>

      <div className="orderbook-summary">
        <div className="stat-tile yes">
          <span className="stat-label">Best {selectedOutcome} Buy</span>
          <span className="stat-value">{bestBuy > 0n ? `${priceToCents(bestBuy).toFixed(1)}¢` : "-"}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Spread</span>
          <span className="stat-value">{spread !== null ? `${spread.toFixed(1)}¢` : "-"}</span>
        </div>
        <div className="stat-tile no">
          <span className="stat-label">Best {selectedOutcome} Sell</span>
          <span className="stat-value">{bestSell > 0n ? `${priceToCents(bestSell).toFixed(1)}¢` : "-"}</span>
        </div>
      </div>

      <div className="orderbook-panels" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <OrderSide
          title={`Buy ${selectedOutcome}`}
          tone="yes"
          levels={buyLevels}
          maxCumulativeDepth={maxCumulativeDepth}
          emptyLabel={`No ${selectedOutcome} buy orders`}
        />
        <OrderSide
          title={`Sell ${selectedOutcome}`}
          tone="no"
          levels={sellLevels}
          maxCumulativeDepth={maxCumulativeDepth}
          emptyLabel={`No ${selectedOutcome} sell orders`}
        />
      </div>
    </div>
  );
}

function OrderSide({
  title,
  tone,
  levels,
  maxCumulativeDepth,
  emptyLabel,
}: {
  title: string;
  tone: "yes" | "no";
  levels: DisplayLevel[];
  maxCumulativeDepth: number;
  emptyLabel: string;
}) {
  const totalShares = levels.length > 0 ? levels[levels.length - 1].cumulativeShares : 0;

  return (
    <section className="orderbook-side">
      <div className="orderbook-side-inner">
        <div className={`orderbook-side-head ${tone}`}>
          <div className="title-block">
            <strong>{title}</strong>
            <span>{levels.length} levels</span>
          </div>
          <div className="total-block">
            <span>Total depth</span>
            <strong>{formatNumber(totalShares)}</strong>
          </div>
        </div>

        <div className="orderbook-head-row">
          <span>Price</span>
          <span>Shares</span>
          <span>Total</span>
          <span>Orders</span>
        </div>

        <div className="orderbook-body">
          {levels.length === 0 ? (
            <div className="orderbook-side-empty">{emptyLabel}</div>
          ) : (
            levels.map((level) => (
              <OrderBookRow
                key={level.price.toString()}
                level={level}
                tone={tone}
                maxCumulativeDepth={maxCumulativeDepth}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function OrderBookRow({
  level,
  tone,
  maxCumulativeDepth,
}: {
  level: DisplayLevel;
  tone: "yes" | "no";
  maxCumulativeDepth: number;
}) {
  const depthPct = Math.min((level.cumulativeShares / maxCumulativeDepth) * 100, 100);

  return (
    <div className={`orderbook-row ${tone}`}>
      <div className="orderbook-depth-fill" style={{ width: `${depthPct}%` }} />
      <span className="price">{priceToCents(level.price).toFixed(1)}¢</span>
      <span>{formatNumber(level.shares)}</span>
      <span>{formatNumber(level.totalCollateral)}</span>
      <span>{level.orderCount}</span>
    </div>
  );
}
