import { useQuery } from "@tanstack/react-query";

export const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/1755304/around-market/v0.0.9";

const ACTIVE_ORDER_STATUSES = ["ACTIVE", "PARTIALLY_FILLED"] as const;

export type LimitOrderStatus =
  | "ACTIVE"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED";

export type LimitOrderKind = "COLLATERAL_BUY" | "SHARE_SELL";

export type Outcome = "YES" | "NO";

export type CandleInterval =
  | "ONE_MINUTE"
  | "FIFTEEN_MINUTES"
  | "THIRTY_MINUTES"
  | "ONE_HOUR"
  | "FOUR_HOURS"
  | "TWELVE_HOURS"
  | "ONE_DAY";

export interface SubgraphMarket {
  id: string;
  marketId: string;
  creator: string;
  market: string;
  collateral: string;
  conditionTokens: string;
  orderBook: string;
  matchingEngine: string;
  conditionId: string;
  startTime: string;
  endTime: string;
  resolved: boolean;
  fee: string;
  question: string;
  dataSource: string;
  createdAtTimestamp: string;
  tradeCount: string;
  volume: string;
  latestPrice?: string | null;
  latestYesPrice?: string | null;
  latestNoPrice?: string | null;
}

export interface SubgraphLimitOrder {
  id: string;
  orderId: string;
  marketId: string;
  maker: string;
  isYes: boolean;
  price: string;
  amount: string;
  filled: string;
  remaining: string;
  status: LimitOrderStatus;
  kind: LimitOrderKind;
  shareOutcome?: Outcome | null;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
  cancelledAtTimestamp?: string | null;
}

export interface SubgraphTrade {
  id: string;
  marketId: string;
  taker: string;
  isYes: boolean;
  outcome: Outcome;
  filled: string;
  avgPrice: string;
  collateralVolume: string;
  totalFee?: string | null;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SubgraphMarketCandle {
  id: string;
  marketId: string;
  isYes: boolean;
  interval: CandleInterval;
  periodStart: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  shareVolume: string;
  tradeCount: string;
  lastTimestamp: string;
}

function compareBigIntDesc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

function compareBigIntAsc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export type OrderDisplaySide = "BUY" | "SELL";

export function orderDisplaySide(order: SubgraphLimitOrder): OrderDisplaySide {
  return order.kind === "SHARE_SELL" ? "SELL" : "BUY";
}

export function sortLimitOrdersByPriceTime(
  orders: SubgraphLimitOrder[],
  side?: OrderDisplaySide,
): SubgraphLimitOrder[] {
  return [...orders].sort((a, b) => {
    const aSide = side ?? orderDisplaySide(a);
    const bSide = side ?? orderDisplaySide(b);
    if (aSide !== bSide) return aSide === "BUY" ? -1 : 1;

    const priceCompare =
      aSide === "BUY"
        ? compareBigIntDesc(BigInt(a.price), BigInt(b.price))
        : compareBigIntAsc(BigInt(a.price), BigInt(b.price));
    if (priceCompare !== 0) return priceCompare;

    const timeCompare = compareBigIntAsc(BigInt(a.createdAtTimestamp), BigInt(b.createdAtTimestamp));
    if (timeCompare !== 0) return timeCompare;

    return compareBigIntAsc(BigInt(a.orderId), BigInt(b.orderId));
  });
}

interface GraphResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function graphRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GraphResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  if (!payload.data) {
    throw new Error("Subgraph returned no data");
  }

  return payload.data;
}

const marketFields = `
  id
  marketId
  creator
  market
  collateral
  conditionTokens: conditionalTokens
  orderBook
  matchingEngine
  conditionId
  startTime
  endTime
  resolved
  fee
  question
  dataSource
  createdAtTimestamp
  tradeCount
  volume
  latestPrice
  latestYesPrice
  latestNoPrice
`;

const orderFields = `
  id
  orderId
  marketId
  maker
  isYes
  price
  amount
  filled
  remaining
  status
  kind
  shareOutcome
  createdAtTimestamp
  updatedAtTimestamp
  cancelledAtTimestamp
`;

const tradeFields = `
  id
  marketId
  taker
  isYes
  outcome
  filled
  avgPrice
  collateralVolume
  totalFee
  blockTimestamp
  transactionHash
`;

const candleFields = `
  id
  marketId
  isYes
  interval
  periodStart
  open
  high
  low
  close
  volume
  shareVolume
  tradeCount
  lastTimestamp
`;

export function useSubgraphMarkets() {
  return useQuery({
    queryKey: ["subgraph", "markets"],
    queryFn: async () => {
      const result = await graphRequest<{ markets: SubgraphMarket[] }>(`
        query Markets {
          markets(first: 1000, orderBy: marketId, orderDirection: desc) {
            ${marketFields}
          }
        }
      `);
      return result.markets;
    },
    refetchInterval: 12_000,
  });
}

export function useSubgraphMarket(marketId: number) {
  return useQuery({
    queryKey: ["subgraph", "market", marketId],
    queryFn: async () => {
      const result = await graphRequest<{ market: SubgraphMarket | null }>(
        `
          query Market($id: ID!) {
            market(id: $id) {
              ${marketFields}
            }
          }
        `,
        { id: String(marketId) },
      );
      return result.market;
    },
    enabled: Number.isFinite(marketId) && marketId > 0,
    refetchInterval: 12_000,
  });
}

export function useSubgraphMarketOrders(marketId: number) {
  return useQuery({
    queryKey: ["subgraph", "orders", "market", marketId],
    queryFn: async () => {
      const result = await graphRequest<{ orders: SubgraphLimitOrder[] }>(
        `
          query MarketOrders($marketId: BigInt!, $statuses: [OrderStatus!]) {
            orders(
              first: 1000
              orderBy: price
              orderDirection: desc
              where: { marketId: $marketId, status_in: $statuses }
            ) {
              ${orderFields}
            }
          }
        `,
        { marketId: String(marketId), statuses: ACTIVE_ORDER_STATUSES },
      );
      return sortLimitOrdersByPriceTime(result.orders);
    },
    enabled: Number.isFinite(marketId) && marketId > 0,
    refetchInterval: 8_000,
  });
}

export function useSubgraphUserOrders(marketId: number, maker?: string) {
  const normalizedMaker = maker?.toLowerCase();
  return useQuery({
    queryKey: ["subgraph", "orders", "user", marketId, normalizedMaker],
    queryFn: async () => {
      const result = await graphRequest<{ orders: SubgraphLimitOrder[] }>(
        `
          query UserOrders($marketId: BigInt!, $maker: Bytes!, $statuses: [OrderStatus!]) {
            orders(
              first: 1000
              orderBy: price
              orderDirection: desc
              where: { marketId: $marketId, maker: $maker, status_in: $statuses }
            ) {
              ${orderFields}
            }
          }
        `,
        { marketId: String(marketId), maker: normalizedMaker, statuses: ACTIVE_ORDER_STATUSES },
      );
      return sortLimitOrdersByPriceTime(result.orders);
    },
    enabled: Number.isFinite(marketId) && marketId > 0 && !!normalizedMaker,
    refetchInterval: 8_000,
  });
}

export function useSubgraphAllUserOrders(maker?: string) {
  const normalizedMaker = maker?.toLowerCase();
  return useQuery({
    queryKey: ["subgraph", "orders", "user", "all", normalizedMaker],
    queryFn: async () => {
      const result = await graphRequest<{ orders: SubgraphLimitOrder[] }>(
        `
          query UserOrders($maker: Bytes!, $statuses: [OrderStatus!]) {
            orders(
              first: 1000
              orderBy: price
              orderDirection: desc
              where: { maker: $maker, status_in: $statuses }
            ) {
              ${orderFields}
            }
          }
        `,
        { maker: normalizedMaker, statuses: ACTIVE_ORDER_STATUSES },
      );
      return sortLimitOrdersByPriceTime(result.orders);
    },
    enabled: !!normalizedMaker,
    refetchInterval: 10_000,
  });
}

export function useSubgraphMarketTrades(marketId: number) {
  return useQuery({
    queryKey: ["subgraph", "trades", "market", marketId],
    queryFn: async () => {
      const result = await graphRequest<{ trades: SubgraphTrade[] }>(
        `
          query MarketTrades($marketId: BigInt!) {
            trades(
              first: 10
              orderBy: blockTimestamp
              orderDirection: desc
              where: { marketId: $marketId }
            ) {
              ${tradeFields}
            }
          }
        `,
        { marketId: String(marketId) },
      );
      return result.trades;
    },
    enabled: Number.isFinite(marketId) && marketId > 0,
    refetchInterval: 8_000,
  });
}

export function useSubgraphMarketCandles(
  marketId: number,
  interval: CandleInterval,
  isYes = true,
) {
  return useQuery({
    queryKey: ["subgraph", "candles", marketId, interval, isYes],
    queryFn: async () => {
      const result = await graphRequest<{ marketCandles: SubgraphMarketCandle[] }>(
        `
          query MarketCandles($marketId: BigInt!, $interval: CandleInterval!, $isYes: Boolean!) {
            marketCandles(
              first: 500
              orderBy: periodStart
              orderDirection: asc
              where: { marketId: $marketId, interval: $interval, isYes: $isYes }
            ) {
              ${candleFields}
            }
          }
        `,
        { marketId: String(marketId), interval, isYes },
      );
      return result.marketCandles;
    },
    enabled: Number.isFinite(marketId) && marketId > 0,
    refetchInterval: 12_000,
  });
}

export function marketToTuple(market: SubgraphMarket): unknown[] {
  return [
    market.creator,
    market.market,
    market.collateral,
    market.conditionTokens,
    market.orderBook,
    market.matchingEngine,
    market.conditionId,
    BigInt(market.startTime),
    BigInt(market.endTime),
    market.resolved,
    BigInt(market.fee),
    market.question,
    market.dataSource,
  ];
}

export function activeOrders(orders: SubgraphLimitOrder[]): SubgraphLimitOrder[] {
  return orders.filter((order) => order.status === "ACTIVE" || order.status === "PARTIALLY_FILLED");
}

export function bestBid(orders: SubgraphLimitOrder[]): bigint | undefined {
  return activeOrders(orders)
    .filter((order) => order.isYes && BigInt(order.remaining) > 0n)
    .reduce<bigint | undefined>((best, order) => {
      const price = BigInt(order.price);
      return best === undefined || price > best ? price : best;
    }, undefined);
}

export function bestAsk(orders: SubgraphLimitOrder[]): bigint | undefined {
  return activeOrders(orders)
    .filter((order) => !order.isYes && BigInt(order.remaining) > 0n)
    .reduce<bigint | undefined>((best, order) => {
      const price = BigInt(order.price);
      return best === undefined || price > best ? price : best;
    }, undefined);
}

export function bestCollateralBuyPrice(
  orders: SubgraphLimitOrder[],
  outcome: Outcome,
): bigint | undefined {
  return activeOrders(orders)
    .filter((order) => {
      if (order.kind !== "COLLATERAL_BUY") return false;
      if (BigInt(order.remaining) <= 0n) return false;
      return (order.isYes ? "YES" : "NO") === outcome;
    })
    .reduce<bigint | undefined>((best, order) => {
      const price = BigInt(order.price);
      return best === undefined || price > best ? price : best;
    }, undefined);
}

export interface OrderBookLevel {
  price: bigint;
  depth: bigint;
  orderCount: number;
}

export interface OutcomeOrderBookLevels {
  buyRows: OrderBookLevel[];
  sellRows: OrderBookLevel[];
}

export function orderDisplayOutcome(order: SubgraphLimitOrder): Outcome {
  if (order.kind === "SHARE_SELL" && order.shareOutcome) {
    return order.shareOutcome;
  }
  return order.isYes ? "YES" : "NO";
}

function buildLevelsFromMaps(
  depths: Map<string, bigint>,
  counts: Map<string, number>,
  side: OrderDisplaySide,
): OrderBookLevel[] {
  return Array.from(depths.entries())
    .map(([price, depth]) => ({ price: BigInt(price), depth, orderCount: counts.get(price) ?? 0 }))
    .sort((a, b) =>
      side === "BUY"
        ? compareBigIntDesc(a.price, b.price)
        : compareBigIntAsc(a.price, b.price),
    );
}

export function buildOutcomeOrderBookLevels(
  orders: SubgraphLimitOrder[],
  outcome: Outcome,
): OutcomeOrderBookLevels {
  const buy = new Map<string, bigint>();
  const sell = new Map<string, bigint>();
  const buyCounts = new Map<string, number>();
  const sellCounts = new Map<string, number>();

  for (const order of activeOrders(orders)) {
    const remaining = BigInt(order.remaining);
    if (remaining <= 0n) continue;

    if (order.kind === "SHARE_SELL") {
      if (order.shareOutcome !== outcome) continue;
      sell.set(order.price, (sell.get(order.price) ?? 0n) + remaining);
      sellCounts.set(order.price, (sellCounts.get(order.price) ?? 0) + 1);
      continue;
    }

    const orderOutcome = order.isYes ? "YES" : "NO";
    if (orderOutcome !== outcome) continue;
    buy.set(order.price, (buy.get(order.price) ?? 0n) + remaining);
    buyCounts.set(order.price, (buyCounts.get(order.price) ?? 0) + 1);
  }

  return {
    buyRows: buildLevelsFromMaps(buy, buyCounts, "BUY"),
    sellRows: buildLevelsFromMaps(sell, sellCounts, "SELL"),
  };
}

export function buildOrderBookLevels(orders: SubgraphLimitOrder[]): {
  yesRows: OrderBookLevel[];
  noRows: OrderBookLevel[];
} {
  const yes = new Map<string, bigint>();
  const no = new Map<string, bigint>();
  const yesCounts = new Map<string, number>();
  const noCounts = new Map<string, number>();

  for (const order of activeOrders(orders)) {
    const remaining = BigInt(order.remaining);
    if (remaining <= 0n) continue;

    const displayOutcome = orderDisplayOutcome(order);
    const book = displayOutcome === "YES" ? yes : no;
    const counts = displayOutcome === "YES" ? yesCounts : noCounts;
    book.set(order.price, (book.get(order.price) ?? 0n) + remaining);
    counts.set(order.price, (counts.get(order.price) ?? 0) + 1);
  }

  return {
    yesRows: buildLevelsFromMaps(yes, yesCounts, "BUY"),
    noRows: buildLevelsFromMaps(no, noCounts, "SELL"),
  };
}
