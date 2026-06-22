export const ONE = 10n ** 18n;
export const HALF = 5n * 10n ** 17n;
export type TradeAction = "buy" | "sell";
export type OrderMode = "market" | "limit";

export function decimalToWei(value: string): bigint {
  const normalized = value.trim();
  if (!normalized) return 0n;

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = (fractionPart.slice(0, 18).padEnd(18, "0") || "0");

  return whole * ONE + BigInt(fraction);
}

export function decimalToUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!normalized) return 0n;

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = fractionPart.slice(0, decimals).padEnd(decimals, "0") || "0";

  return whole * (10n ** BigInt(decimals)) + BigInt(fraction);
}

export function weiToNumber(value: bigint): number {
  return Number(value) / 1e18;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export function priceWeiToPercent(price: bigint): number {
  return clampPercent(weiToNumber(price) * 100);
}

export function formatProbabilityPercent(percent: number): string {
  return `${clampPercent(percent).toFixed(2)}%`;
}

export function unitsToNumber(value: bigint, decimals: number): number {
  return Number(value) / Number(10n ** BigInt(decimals));
}

export function scaleUnits(value: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) return value;
  if (fromDecimals < toDecimals) return value * (10n ** BigInt(toDecimals - fromDecimals));
  return value / (10n ** BigInt(fromDecimals - toDecimals));
}

export function calcBuyShareAmount(payAmount: bigint, price: bigint): bigint {
  if (payAmount <= 0n || price <= 0n) return 0n;
  return (payAmount * ONE) / price;
}

export function calcLimitShareAmount(shares: bigint): bigint {
  return shares > 0n ? shares : 0n;
}

export function calcMarketPrepay(amount: bigint): bigint {
  if (amount <= 0n) return 0n;
  return (HALF * amount) / ONE;
}

export function calcLimitPrepay(price: bigint, amount: bigint): bigint {
  if (price <= 0n || amount <= 0n) return 0n;
  return (price * amount) / ONE;
}

export function calcLimitOrderPrepay(action: TradeAction, price: bigint, amount: bigint): bigint {
  if (action === "sell") return 0n;
  return calcLimitPrepay(price, amount);
}

export function calcLimitOrderBookSide(action: TradeAction, isYes: boolean): boolean {
  return action === "sell" ? !isYes : isYes;
}

export function calcTradeApprovalKind(action: TradeAction, _orderMode: OrderMode): "usdc" | "shares" {
  return action === "sell" ? "shares" : "usdc";
}

export function calcBufferedMaxCost(payAmount: bigint): bigint {
  if (payAmount <= 0n) return 0n;
  return (payAmount * 110n) / 100n;
}

export function calcTakerFeeAllowance(maxCost: bigint, feeRate: bigint): bigint {
  if (maxCost <= 0n || feeRate <= 0n) return 0n;
  return (maxCost * feeRate) / 1_000_000n;
}

export function calcMarketBuyApproval(maxCost: bigint, feeRate: bigint): bigint {
  if (maxCost <= 0n) return 0n;
  return maxCost + calcTakerFeeAllowance(maxCost, feeRate);
}

export function calcMarketSellCostPrice(isYes: boolean, bestBidYes?: bigint, bestAskNo?: bigint): bigint {
  return isYes ? (bestBidYes ?? 0n) : (bestAskNo ?? 0n);
}

export function calcMarketSellMinReceive(amount: bigint, bidPrice: bigint): bigint {
  if (amount <= 0n || bidPrice <= 0n) return 0n;
  const expectedReceive = (amount * bidPrice) / ONE;
  return (expectedReceive * 90n) / 100n;
}
