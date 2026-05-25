export function formatPrice(price: bigint, precision = 18): string {
  const div = 10n ** BigInt(precision);
  const integer = price / div;
  const fraction = price % div;
  const fractionStr = fraction.toString().padStart(precision, "0").slice(0, 4);
  return `${integer}.${fractionStr}`;
}

export function formatAmount(amount: bigint, decimals = 6): string {
  const div = 10n ** BigInt(decimals);
  const val = Number(amount) / Number(div);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return val.toFixed(4);
}

export function formatAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function parsePrice(input: string): bigint {
  const val = parseFloat(input);
  if (isNaN(val) || val < 0 || val > 1) throw new Error("Invalid price (0-1)");
  return BigInt(Math.round(val * 1e18));
}

export function parseAmount(input: string, decimals = 6): bigint {
  const [int, frac = ""] = input.split(".");
  const padded = int + frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(padded);
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
