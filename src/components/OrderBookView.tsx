import { useReadContract, useReadContracts } from "wagmi";
import { ABIs } from "../abis";
import { useMemo } from "react";
import { ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { unitsToNumber } from "../utils/tradingMath";

interface Props {
 marketId: number;
 orderBookAddr: string;
 collateralAddr: string;
}

// 把 wei price 格式化为 cents (1e18 → 0~1)
function priceToCents(price: bigint): number {
 return Number(price) / 1e16; // 1e18 / 100 = 1e16, /1e16 还原 cents
}

// amount 是 CTF 份额数量，精度与 collateral decimals 一致
function amountToShares(amount: bigint, decimals: number): number {
 return unitsToNumber(amount, decimals);
}

// ── 深度条组件 ─────────────────────────────────────────────────────────────────
function DepthBar({
 value,
 max,
 color,
 align = "right",
}: {
 value: number;
 max: number;
 color: string;
 align?: "left" | "right";
}) {
 const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
 return (
 <div className="relative h-7 overflow-hidden rounded" style={{ background: "var(--bg-elevated)" }}>
 <div
 className="absolute top-0 h-full transition-all duration-300"
 style={{
 width: `${pct}%`,
 [align]: 0,
 background:
 color === "yes"
 ? "linear-gradient(to left, rgba(16,185,129,0.18), rgba(16,185,129,0.32))"
 : "linear-gradient(to right, rgba(244,63,94,0.18), rgba(244,63,94,0.32))",
 }}
 />
 </div>
 );
}

export default function OrderBookView({ marketId, orderBookAddr, collateralAddr }: Props) {
 const { data: collateralDecimalsRaw } = useReadContract({
 address: collateralAddr as `0x${string}`,
 abi: ERC20_DECIMALS_ABI,
 functionName: "decimals",
 query: { enabled: !!collateralAddr },
 });
 const collateralDecimals = Number(collateralDecimalsRaw ??18);

 // 取所有 YES 价格档 + 所有 NO 价格档
 const { data: pricesData, isLoading: pricesLoading } = useReadContracts({
 contracts: [
 {
 address: orderBookAddr as `0x${string}`,
 abi: ABIs.OrderBook,
 functionName: "getSortedPrices",
 args: [BigInt(marketId), true],
 },
 {
 address: orderBookAddr as `0x${string}`,
 abi: ABIs.OrderBook,
 functionName: "getSortedPrices",
 args: [BigInt(marketId), false],
 },
 ],
 query: { enabled: !!orderBookAddr },
 });

 const yesPrices = (pricesData?.[0]?.result as bigint[] | undefined) ?? [];
 const noPrices = (pricesData?.[1]?.result as bigint[] | undefined) ?? [];

 // 对每个价格档取深度 (累计 amount)
 const depthCalls = useMemo(() => {
 const calls: any[] = [];
 yesPrices.forEach(p => {
 calls.push({
 address: orderBookAddr as `0x${string}`,
 abi: ABIs.OrderBook,
 functionName: "getDepth" as const,
 args: [BigInt(marketId), true, p, 100n] as const,
 });
 });
 noPrices.forEach(p => {
 calls.push({
 address: orderBookAddr as `0x${string}`,
 abi: ABIs.OrderBook,
 functionName: "getDepth" as const,
 args: [BigInt(marketId), false, p, 100n] as const,
 });
 });
 return calls;
 }, [orderBookAddr, marketId, yesPrices, noPrices]);

 const { data: depthData, isLoading: depthLoading } = useReadContracts({
 contracts: depthCalls as any,
 query: { enabled: depthCalls.length > 0 },
 });

 // 整理数据
 const yesRows = useMemo(() => {
 return yesPrices.map((p, i) => {
 const depth = (depthData?.[i]?.result as bigint | undefined) ?? 0n;
 return { price: p, depth };
 });
 }, [yesPrices, depthData]);

 const noRows = useMemo(() => {
 return noPrices.map((p, i) => {
 const depth = (depthData?.[yesPrices.length + i]?.result as bigint | undefined) ?? 0n;
 return { price: p, depth };
 });
 }, [noPrices, depthData, yesPrices.length]);

 // 计算最大深度（用于 depth bar 比例）
 const maxYes = Math.max(...yesRows.map(r => amountToShares(r.depth, collateralDecimals)), 0);
 const maxNo = Math.max(...noRows.map(r => amountToShares(r.depth, collateralDecimals)), 0);
 const maxDepth = Math.max(maxYes, maxNo, 1);

 // 找中间价（spread）
 const bestYesBid = yesPrices.length > 0 ? yesPrices[0] : 0n; // 买价最高 (倒序时第一个)
 const bestNoAsk = noPrices.length > 0 ? noPrices[0] : 0n; // 卖价最低
 const spread =
 bestYesBid > 0n && bestNoAsk > 0n
 ? priceToCents(bestNoAsk) - priceToCents(bestYesBid)
 : null;

 const isLoading = pricesLoading || depthLoading;
 const hasData = yesRows.length > 0 || noRows.length > 0;

 if (isLoading) {
 return (
 <div className="space-y-2">
 {[0, 1, 2, 3, 4].map(i => (
 <div key={i} className="h-6 rounded bg-gray-100 animate-pulse" />
 ))}
 </div>
 );
 }

 if (!hasData) {
 return (
 <div className="text-center py-10">
 <div className="text-3xl mb-2 opacity-30">📋</div>
 <p className="text-xs text-gray-400">No orders yet — be the first to place one</p>
 </div>
 );
 }

 return (
 <div className="space-y-3">
 {/* Header — column labels */}
 <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-[10px] uppercase tracking-wider font-semibold text-gray-500 pb-1 border-b border-gray-200">
 <div className="text-right pr-2">YES bid</div>
 <div className="text-center px-2">Price</div>
 <div className="text-left pl-2">NO ask</div>
 </div>

 {/* Rows — show matching prices side by side, or stack when count differs */}
 <div className="space-y-0 max-h-[400px] overflow-y-auto">
 {(() => {
 const maxLen = Math.max(yesRows.length, noRows.length);
 const rows: any[] = [];
 for (let i = 0; i < maxLen; i++) {
 const yes = yesRows[i];
 const no = noRows[i];
 rows.push(
 <div
 key={i}
 className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-1 hover:bg-gray-50 transition-colors"
 >
 {/* YES side */}
 <div className="flex items-center gap-2 justify-end pr-2">
 {yes ? (
 <>
 <span className="text-emerald-700 font-mono text-xs font-semibold w-14 text-right">
  {amountToShares(yes.depth, collateralDecimals).toFixed(2)}
  </span>
  <DepthBar value={amountToShares(yes.depth, collateralDecimals)} max={maxDepth} color="yes" align="right" />
 </>
 ) : (
 <span className="text-gray-300 text-xs">—</span>
 )}
 </div>

 {/* Price label (only show actual price for whichever side has data) */}
 <div className="text-center min-w-[48px]">
 {yes ? (
 <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold font-mono">
 {priceToCents(yes.price).toFixed(0)}¢
 </span>
 ) : no ? (
 <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold font-mono">
 {priceToCents(no.price).toFixed(0)}¢
 </span>
 ) : (
 <span className="text-gray-300 text-xs">—</span>
 )}
 </div>

 {/* NO side */}
 <div className="flex items-center gap-2 pl-2">
 {no ? (
 <>
  <DepthBar value={amountToShares(no.depth, collateralDecimals)} max={maxDepth} color="no" align="left" />
  <span className="text-rose-700 font-mono text-xs font-semibold w-14 text-left">
  {amountToShares(no.depth, collateralDecimals).toFixed(2)}
 </span>
 </>
 ) : (
 <span className="text-gray-300 text-xs">—</span>
 )}
 </div>
 </div>
 );
 }
 return rows;
 })()}
 </div>

 {/* Footer — best prices summary */}
 <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-center">
 <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
 <div className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">
 Best YES bid
 </div>
 <div className="text-base font-bold font-mono text-emerald-700">
 {bestYesBid > 0n ? `${priceToCents(bestYesBid).toFixed(0)}¢` : "—"}
 </div>
 </div>
 <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
 <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
 Spread
 </div>
 <div className="text-base font-bold font-mono text-gray-700">
 {spread !== null ? `${spread.toFixed(0)}¢` : "—"}
 </div>
 </div>
 <div className="rounded-lg bg-rose-50 border border-rose-100 p-2">
 <div className="text-[10px] uppercase font-semibold text-rose-600 tracking-wider">
 Best NO ask
 </div>
 <div className="text-base font-bold font-mono text-rose-700">
 {bestNoAsk > 0n ? `${priceToCents(bestNoAsk).toFixed(0)}¢` : "—"}
 </div>
 </div>
 </div>
 </div>
 );
}
