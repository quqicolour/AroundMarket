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
  shareOutcomeIsYes?: boolean | null;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
  cancelledAtTimestamp?: string | null;
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
  conditionTokens
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
  shareOutcomeIsYes
  createdAtTimestamp
  updatedAtTimestamp
  cancelledAtTimestamp
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
      const result = await graphRequest<{ limitOrders: SubgraphLimitOrder[] }>(
        `
          query MarketOrders($marketId: BigInt!, $statuses: [LimitOrderStatus!]) {
            limitOrders(
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
      return result.limitOrders;
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
      const result = await graphRequest<{ limitOrders: SubgraphLimitOrder[] }>(
        `
          query UserOrders($marketId: BigInt!, $maker: Bytes!) {
            limitOrders(
              first: 1000
              orderBy: updatedAtTimestamp
              orderDirection: desc
              where: { marketId: $marketId, maker: $maker }
            ) {
              ${orderFields}
            }
          }
        `,
        { marketId: String(marketId), maker: normalizedMaker },
      );
      return result.limitOrders;
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
      const result = await graphRequest<{ limitOrders: SubgraphLimitOrder[] }>(
        `
          query UserOrders($maker: Bytes!) {
            limitOrders(
              first: 1000
              orderBy: updatedAtTimestamp
              orderDirection: desc
              where: { maker: $maker }
            ) {
              ${orderFields}
            }
          }
        `,
        { maker: normalizedMaker },
      );
      return result.limitOrders;
    },
    enabled: !!normalizedMaker,
    refetchInterval: 10_000,
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
      return best === undefined || price < best ? price : best;
    }, undefined);
}

export interface OrderBookLevel {
  price: bigint;
  depth: bigint;
  orderCount: number;
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

    const book = order.isYes ? yes : no;
    const counts = order.isYes ? yesCounts : noCounts;
    book.set(order.price, (book.get(order.price) ?? 0n) + remaining);
    counts.set(order.price, (counts.get(order.price) ?? 0) + 1);
  }

  return {
    yesRows: Array.from(yes.entries())
      .map(([price, depth]) => ({ price: BigInt(price), depth, orderCount: yesCounts.get(price) ?? 0 }))
      .sort((a, b) => Number(b.price - a.price)),
    noRows: Array.from(no.entries())
      .map(([price, depth]) => ({ price: BigInt(price), depth, orderCount: noCounts.get(price) ?? 0 }))
      .sort((a, b) => Number(a.price - b.price)),
  };
}
