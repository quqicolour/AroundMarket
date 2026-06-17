import test from "node:test";
import assert from "node:assert/strict";
import {
  calcBuyShareAmount,
  calcLimitPrepay,
  calcLimitOrderPrepay,
  calcLimitOrderBookSide,
  calcLimitShareAmount,
  calcMarketPrepay,
  calcMarketSellCostPrice,
  calcMarketSellMinReceive,
  calcTradeApprovalKind,
  decimalToUnits,
  decimalToWei,
  formatProbabilityPercent,
  priceWeiToPercent,
  unitsToNumber,
} from "../src/utils/tradingMath.ts";

test("market buy approval covers contract prepay at 0.5 per share", () => {
  const pay = decimalToUnits("1", 6);
  const bestAsk = decimalToWei("0.25");
  const amount = calcBuyShareAmount(pay, bestAsk);

  assert.equal(amount, 4_000_000n);
  assert.equal(calcMarketPrepay(amount), 2_000_000n);
});

test("market sell does not require a USDC prepay allowance", () => {
  const amount = decimalToUnits("3", 6);

  assert.equal(calcLimitOrderPrepay("sell", decimalToWei("0.3"), amount), 0n);
});

test("market sell uses share approval instead of USDC approval", () => {
  assert.equal(calcTradeApprovalKind("buy", "market"), "usdc");
  assert.equal(calcTradeApprovalKind("buy", "limit"), "usdc");
  assert.equal(calcTradeApprovalKind("sell", "market"), "shares");
  assert.equal(calcTradeApprovalKind("sell", "limit"), "shares");
});

test("market sell min receive uses the matched bid payment", () => {
  const amount = decimalToUnits("2", 6);
  const bestBidYes = decimalToWei("0.30");
  const bestAskNo = decimalToWei("0.20");

  assert.equal(calcMarketSellCostPrice(true, bestBidYes, bestAskNo), bestBidYes);
  assert.equal(calcMarketSellCostPrice(false, bestBidYes, bestAskNo), bestAskNo);
  assert.equal(calcMarketSellMinReceive(amount, bestBidYes), 540_000n);
});

test("limit order amount follows collateral decimals and prepay is price times amount", () => {
  const shares = calcLimitShareAmount(decimalToUnits("5", 6));
  const price = decimalToWei("0.4");

  assert.equal(shares, 5_000_000n);
  assert.equal(calcLimitPrepay(price, shares), 2_000_000n);
});

test("limit sell escrows shares instead of locking collateral", () => {
  const shares = calcLimitShareAmount(decimalToUnits("5", 6));
  const price = decimalToWei("0.4");

  assert.equal(calcLimitOrderPrepay("buy", price, shares), 2_000_000n);
  assert.equal(calcLimitOrderPrepay("sell", price, shares), 0n);
});

test("limit sell orders are posted on the opposite book side", () => {
  assert.equal(calcLimitOrderBookSide("buy", true), true);
  assert.equal(calcLimitOrderBookSide("buy", false), false);
  assert.equal(calcLimitOrderBookSide("sell", true), false);
  assert.equal(calcLimitOrderBookSide("sell", false), true);
});

test("collateral amounts use the token decimals", () => {
  assert.equal(decimalToUnits("1.234567", 6), 1_234_567n);
  assert.equal(decimalToUnits("1.23456789", 6), 1_234_567n);
  assert.equal(unitsToNumber(1_234_567n, 6), 1.234567);
});

test("market probability display clamps and formats to 0.01 percent", () => {
  assert.equal(priceWeiToPercent(decimalToWei("0.123456")), 12.3456);
  assert.equal(formatProbabilityPercent(priceWeiToPercent(decimalToWei("0.123456"))), "12.35%");
  assert.equal(formatProbabilityPercent(priceWeiToPercent(decimalToWei("2"))), "100.00%");
  assert.equal(formatProbabilityPercent(priceWeiToPercent(-1n)), "0.00%");
});
