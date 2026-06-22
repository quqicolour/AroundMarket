import test from "node:test";
import assert from "node:assert/strict";
import {
  bestAsk,
  bestBid,
  bestCollateralBuyPrice,
  bestShareSellPrice,
  buildOutcomeOrderBookLevels,
  sortLimitOrdersByPriceTime,
} from "../src/utils/subgraph.ts";

function order(overrides) {
  const item = {
    marketId: "1",
    maker: "0x0000000000000000000000000000000000000001",
    isYes: true,
    price: "500000000000000000",
    amount: "1000000",
    filled: "0",
    remaining: "1000000",
    status: "ACTIVE",
    kind: "COLLATERAL_BUY",
    shareOutcome: null,
    createdAtTimestamp: String(overrides.orderId),
    updatedAtTimestamp: String(overrides.orderId),
    cancelledAtTimestamp: null,
    ...overrides,
  };
  return {
    ...item,
    id: String(item.orderId),
    orderId: String(item.orderId),
    createdAtTimestamp: String(item.createdAtTimestamp),
    updatedAtTimestamp: String(item.updatedAtTimestamp),
  };
}

test("buy orders sort by highest price then oldest order", () => {
  const sorted = sortLimitOrdersByPriceTime(
    [
      order({ orderId: 3, price: "470000000000000000", createdAtTimestamp: "10" }),
      order({ orderId: 2, price: "510000000000000000", createdAtTimestamp: "20" }),
      order({ orderId: 1, price: "510000000000000000", createdAtTimestamp: "10" }),
    ],
    "BUY",
  );

  assert.deepEqual(sorted.map((item) => item.orderId), ["1", "2", "3"]);
});

test("sell orderbook levels sort by lowest price first", () => {
  const { sellRows } = buildOutcomeOrderBookLevels(
    [
      order({
        orderId: 1,
        isYes: false,
        kind: "SHARE_SELL",
        shareOutcome: "NO",
        price: "510000000000000000",
      }),
      order({
        orderId: 2,
        isYes: false,
        kind: "SHARE_SELL",
        shareOutcome: "NO",
        price: "470000000000000000",
      }),
    ],
    "NO",
  );

  assert.deepEqual(sellRows.map((level) => level.price), [
    470000000000000000n,
    510000000000000000n,
  ]);
});

test("market sell reference only uses collateral buy orders", () => {
  const orders = [
    order({
      orderId: 1,
      isYes: false,
      kind: "SHARE_SELL",
      shareOutcome: "YES",
      price: "900000000000000000",
    }),
    order({
      orderId: 2,
      isYes: true,
      kind: "COLLATERAL_BUY",
      price: "420000000000000000",
    }),
  ];

  assert.equal(bestCollateralBuyPrice(orders, "YES"), 420000000000000000n);
});

test("market buy reference only uses share sell orders", () => {
  const orders = [
    order({
      orderId: 1,
      isYes: false,
      kind: "COLLATERAL_BUY",
      price: "900000000000000000",
    }),
    order({
      orderId: 2,
      isYes: false,
      kind: "SHARE_SELL",
      shareOutcome: "NO",
      price: "470000000000000000",
    }),
  ];

  assert.equal(bestAsk(orders), 470000000000000000n);
});

test("market buy YES uses YES share sell orders", () => {
  const orders = [
    order({
      orderId: 1,
      isYes: true,
      kind: "COLLATERAL_BUY",
      price: "410000000000000000",
    }),
    order({
      orderId: 2,
      isYes: true,
      kind: "SHARE_SELL",
      shareOutcome: "YES",
      price: "880000000000000000",
    }),
    order({
      orderId: 3,
      isYes: false,
      kind: "SHARE_SELL",
      shareOutcome: "YES",
      price: "460000000000000000",
    }),
    order({
      orderId: 4,
      isYes: false,
      kind: "SHARE_SELL",
      shareOutcome: "NO",
      price: "310000000000000000",
    }),
  ];

  assert.equal(bestShareSellPrice(orders, "YES"), 460000000000000000n);
  assert.equal(bestShareSellPrice(orders, "NO"), 310000000000000000n);
  assert.equal(bestBid(orders), 410000000000000000n);
});
