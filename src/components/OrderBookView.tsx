import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { buildOrderBookLevels, OrderBookLevel, useSubgraphMarketOrders } from "../utils/subgraph";
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
  const { data: collateralDecimalsRaw } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_DECIMALS_ABI,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

  const { data: orders = [], isLoading } = useSubgraphMarketOrders(marketId);
  const { yesRows, noRows } = useMemo(() => buildOrderBookLevels(orders), [orders]);

  const yesLevels = useMemo(
    () => buildDisplayLevels(yesRows, collateralDecimals),
    [yesRows, collateralDecimals],
  );
  const noLevels = useMemo(
    () => buildDisplayLevels(noRows, collateralDecimals),
    [noRows, collateralDecimals],
  );

  const maxCumulativeDepth = Math.max(
    ...yesLevels.map((row) => row.cumulativeShares),
    ...noLevels.map((row) => row.cumulativeShares),
    1,
  );
  const bestYesBid = yesRows[0]?.price ?? 0n;
  const bestNoAsk = noRows[0]?.price ?? 0n;
  const spread =
    bestYesBid > 0n && bestNoAsk > 0n
      ? priceToCents(bestNoAsk) - priceToCents(bestYesBid)
      : null;

  if (isLoading) {
    return (
      <div className="orderbook-shell">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="orderbook-skeleton" />
        ))}
      </div>
    );
  }

  if (yesLevels.length === 0 && noLevels.length === 0) {
    return (
      <div className="orderbook-empty">
        <p>No orders yet</p>
        <span>Place a limit order to create the first price level.</span>
      </div>
    );
  }

  return (
    <div className="orderbook-shell">
      <div className="orderbook-summary">
        <SummaryTile label="Best YES Bid" value={bestYesBid > 0n ? `${priceToCents(bestYesBid).toFixed(1)}c` : "-"} tone="yes" />
        <SummaryTile label="Spread" value={spread !== null ? `${spread.toFixed(1)}c` : "-"} />
        <SummaryTile label="Best NO Ask" value={bestNoAsk > 0n ? `${priceToCents(bestNoAsk).toFixed(1)}c` : "-"} tone="no" />
      </div>

      <div className="orderbook-panels">
        <OrderSide
          title="YES Bids"
          tone="yes"
          levels={yesLevels}
          maxCumulativeDepth={maxCumulativeDepth}
          emptyLabel="No YES bids"
        />
        <OrderSide
          title="NO Asks"
          tone="no"
          levels={noLevels}
          maxCumulativeDepth={maxCumulativeDepth}
          emptyLabel="No NO asks"
        />
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "yes" | "no" | "neutral";
}) {
  return (
    <div className={`orderbook-summary-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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
    <section className={`orderbook-side ${tone}`} aria-label={title}>
      <div className="orderbook-side-header">
        <div>
          <strong>{title}</strong>
          <span>{levels.length} levels</span>
        </div>
        <div className="orderbook-side-total">
          <span>Total depth</span>
          <strong>{formatNumber(totalShares)}</strong>
        </div>
      </div>

      <div className="orderbook-table-head">
        <span>Price</span>
        <span>Shares</span>
        <span>Total</span>
        <span>Orders</span>
      </div>

      <div className="orderbook-table-body">
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
      <div
        className="orderbook-depth-fill"
        style={{
          width: `${depthPct}%`,
        }}
      />
      <span className="orderbook-price">{priceToCents(level.price).toFixed(1)}c</span>
      <span>{formatNumber(level.shares)}</span>
      <span>{formatNumber(level.totalCollateral)}</span>
      <span>{level.orderCount}</span>
    </div>
  );
}
