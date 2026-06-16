import { useState, useEffect, useRef } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { ABIs } from "../abis";
import { Loader2 } from "lucide-react";
import { useTxToast } from "./TxToastContext";
import { CONDITIONAL_TOKENS_OPERATOR_ABI, CONDITIONAL_TOKENS_POSITION_ABI } from "../config/contractAbis";
import { erc20Abi } from "viem";
import {
  calcBufferedMaxCost,
  calcBuyShareAmount,
  calcLimitOrderPrepay,
  calcLimitOrderBookSide,
  calcLimitShareAmount,
  calcMarketPrepay,
  calcMarketSellCostPrice,
  calcMarketSellMinReceive,
  calcTradeApprovalKind,
  decimalToWei,
  decimalToUnits,
  formatProbabilityPercent,
  priceWeiToPercent,
  unitsToNumber,
  weiToNumber,
} from "../utils/tradingMath";

// ── ERC20 ABI (inline, no extra file needed) ──────────────────────────────────
const ERC20_ABI = erc20Abi;

interface Props {
 // MarketData tuple: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
 marketData: readonly [string, string, string, string, string, string, string, bigint, bigint, boolean, number];
 marketId: number;
 initialSide?: "yes" | "no";
}

type TradeAction = "buy" | "sell";
type TradeSide = "yes" | "no";

const MOCK_PRICE_YES = 0.58;

// ── Custom Dropdown ────────────────────────────────────────────────────────────
function CustomSelect({
  value,
  options,
  onChange,
  disabled,
  accentColor,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        style={{
          width: "100%",
          padding: "9px 36px 9px 14px",
          borderRadius: 10,
          border: `1.5px solid ${open ? (accentColor ?? "var(--primary)") : "var(--border)"}`,
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          textAlign: "left",
          transition: "border-color 150ms",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: accentColor ?? "var(--text-primary)" }}>{selected?.label}</span>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          style={{ color: "var(--text-tertiary)", transition: "transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border-strong)",
          borderRadius: 10, padding: "4px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8,
                border: "none", background: "transparent",
                color: opt.value === value ? (accentColor ?? "var(--primary)") : "var(--text-primary)",
                fontSize: 13, fontWeight: opt.value === value ? 700 : 500,
                cursor: "pointer", textAlign: "left",
                fontFamily: "inherit",
                transition: "background 100ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-overlay)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TradingForm({ marketData, marketId, initialSide = "yes" }: Props) {
  const { showPending, showSuccess, showError } = useTxToast();
  const { isConnected, address: user } = useAccount();
 const chainId = useChainId();

  const [action, setAction] = useState<TradeAction>("buy");
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [orderMode, setOrderMode] = useState<"market" | "limit">("market");
  const [collateralInput, setCollateralInput] = useState("");
  const [limitPriceInput, setLimitPriceInput] = useState("");

  // MarketData tuple: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
  const marketAddr = marketData[1] as string;
  const collateralAddr = marketData[2] as string;
  const conditionId = marketData[6] as `0x${string}`;
  const isResolved = marketData[9] as boolean;
  const conditionalTokensAddr = marketData[3] as string;

  const { data: collateralDecimalsRaw } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

  const collateral = parseFloat(collateralInput) ||0;
  const limitPrice = parseFloat(limitPriceInput) ||0;
  const collateralAmount = decimalToUnits(collateralInput, collateralDecimals);
  const limitPriceWei = decimalToWei(limitPriceInput);
  const orderBookAddr = marketData[4] as string;

  // isYes 是 buy/sell 路径的核心决定参数,提前定义供多处使用
  const isYes = side === "yes";

  //实时获取 YES最佳买价 / NO最佳卖价 (1e18精度)
  // ABI 是 hardhat artifact 顶层 array, wagmi 推断不出返回值类型,所以用 bigint 断言
  const { data: liveBestBid } = useReadContract({
   address: orderBookAddr as `0x${string}`,
   abi: ABIs.OrderBook as any,
   functionName: "getBestBid",
   args: [BigInt(marketId)],
   query: { enabled: isConnected && !!orderBookAddr },
   });
  const { data: liveBestAsk } = useReadContract({
   address: orderBookAddr as `0x${string}`,
   abi: ABIs.OrderBook as any,
   functionName: "getBestAsk",
   args: [BigInt(marketId)],
   query: { enabled: isConnected && !!orderBookAddr },
   });
  const liveBestBidBig: bigint | undefined = liveBestBid as bigint | undefined;
  const liveBestAskBig: bigint | undefined = liveBestAsk as bigint | undefined;

  // 读取用户 YES/NO CTF 持仓，数量精度与 collateral decimals 一致
  // CTF.balanceOf 自定义重载: (address holder, bytes32 conditionId, uint256 outcomeIndex)
  const OUTCOME_YES = 0;
  const OUTCOME_NO = 1;
  const { data: userYesBalance, refetch: refetchUserYesBalance } = useReadContract({
   address: conditionalTokensAddr as `0x${string}`,
   abi: CONDITIONAL_TOKENS_POSITION_ABI,
   functionName: "balanceOf",
   args: [user as `0x${string}`, conditionId, BigInt(OUTCOME_YES)],
   query: { enabled: isConnected && !!user && !!conditionalTokensAddr && !!conditionId },
   });
  const { data: userNoBalance, refetch: refetchUserNoBalance } = useReadContract({
   address: conditionalTokensAddr as `0x${string}`,
   abi: CONDITIONAL_TOKENS_POSITION_ABI,
   functionName: "balanceOf",
   args: [user as `0x${string}`, conditionId, BigInt(OUTCOME_NO)],
   query: { enabled: isConnected && !!user && !!conditionalTokensAddr && !!conditionId },
   });
  const userYesBig: bigint | undefined = userYesBalance as bigint | undefined;
  const userNoBig: bigint | undefined = userNoBalance as bigint | undefined;
  const userShareYes = userYesBig ? unitsToNumber(userYesBig, collateralDecimals) : 0;
  const userShareNo = userNoBig ? unitsToNumber(userNoBig, collateralDecimals) : 0;
  const userShareSide = isYes ? userShareYes : userShareNo;
  const userShareBig = isYes ? userYesBig : userNoBig;

  // priceForCalc:
  // - 市价单:用实时 bestPrice (buy YES→bestAsk, buy NO→bestBid, sell 对称)
  // - 限价单:用用户输入的 limitPrice
  const bestBidYesPrice = liveBestBidBig && liveBestBidBig >0n ? weiToNumber(liveBestBidBig) :0;
  const bestAskNoPrice = liveBestAskBig && liveBestAskBig >0n ? weiToNumber(liveBestAskBig) :0;
  const bestBidYesPercent = liveBestBidBig && liveBestBidBig >0n ? priceWeiToPercent(liveBestBidBig) : null;
  const bestAskNoPercent = liveBestAskBig && liveBestAskBig >0n ? priceWeiToPercent(liveBestAskBig) : null;
  const buyRefPrice = isYes ? bestAskNoPrice : bestBidYesPrice;
  const sellCostPriceWei = calcMarketSellCostPrice(isYes, liveBestBidBig, liveBestAskBig);
  const sellCostPrice = sellCostPriceWei >0n ? weiToNumber(sellCostPriceWei) :0;
  const refPrice = action === "sell" ? sellCostPrice : buyRefPrice;
  const priceForCalc = orderMode === "market" && refPrice >0
   ? refPrice
   : (limitPrice >0 ? limitPrice : MOCK_PRICE_YES);

  //市价单无流动性检查(只对买入生效;卖出若无对簿,合约 sellShares 会自动回退部分成交)
  const noLiquidity = orderMode === "market" && action === "buy" && isConnected && buyRefPrice ===0;

  const sideColor = isYes ? "var(--yes)" : "var(--no)";
  const sideBg = sideColor;

  // amountWei: 合约 amount 语义 = CTF 份额数量，精度与 collateral decimals 一致
  // - 限价/卖出: 用户输入 1 => 1 * 10 ** collateralDecimals
  // - 市价买入: amount = collateralInput * 1e18 / price
  const amountWei = (() => {
   if (collateralAmount <=0n) return 0n;
   if (orderMode === "limit") return calcLimitShareAmount(collateralAmount);
   if (action === "sell") return collateralAmount;
   const calcPriceWei = isYes ? (liveBestAskBig ??0n) : (liveBestBidBig ??0n);
   return calcBuyShareAmount(collateralAmount, calcPriceWei);
  })();

  // expectedCtf (preview: 期望得到/挂出的 CTF 数量,按 collateral decimals 显示)
  // - 限价: input 是份数
  // - 市价买入: input 是 USDC,期望得到 = USDC / priceForCalc
  const expectedCtf = orderMode === "limit" && amountWei >0n
   ? unitsToNumber(amountWei, collateralDecimals)
   : action === "buy" && collateral >0 && priceForCalc >0
   ? collateral / priceForCalc
   : 0;

  // 卖出净收入预览: amount × (1 - 对手 bestAsk)
  // 卖 YES → 撮合 NO 卖单(对手 bestAsk 是 NO 价,撮合成本 = amount × bestAsk_NO)
  //         净收入 = amount × 1 - amount × bestAsk_NO
  // 卖 NO  → 撮合 YES 卖单(对手 bestAsk 是 YES 价)
  //         净收入 = amount × 1 - amount × bestAsk_YES
  const expectedReceive: bigint = action === "sell" && amountWei >0n && sellCostPrice >0
   ? (amountWei * (10n **18n - sellCostPriceWei)) / (10n **18n)
    : 0n;

  // priceWei (1e18精度,传给合约的 limitPrice 参数)
  // 限价单: 用 limitPriceInput
  // 市价单: 用实时 bestAsk/bestBid
  const priceWei = (() => {
   if (orderMode === "limit") {
   return limitPriceWei;
   }
   // 买: YES 吃 NO ask, NO 吃 YES bid; 卖: YES 反向吃 YES bid, NO 反向吃 NO ask
   if (action === "sell") return sellCostPriceWei;
   const ref = isYes ? liveBestAskBig : liveBestBidBig;
   return ref && ref >0n ? ref :0n;
  })();
  const limitSellReceive: bigint = action === "sell" && orderMode === "limit" && amountWei >0n && priceWei >0n
   ? (amountWei * priceWei) / (10n **18n)
   : 0n;

  // approveAmt 拆分: 抵押物金额按 ERC20 decimals, CTF shares/price 保持 1e18
 //   - 限价买入(placeOrder):prepay = price × amount / 1e18
 //   - 限价卖出(placeSellOrder):不锁 USDC,改为托管 CTF shares
 //   - 市价买入/卖出(buyShares/sellShares):内部 _executeTakerOrders 固定按 0.5 × amount 预付
 // maxCost 只做滑点保护,不能作为 ERC20 allowance;否则低价买入/卖出会在 transferFrom 阶段失败
  const placeOrderCost: bigint = orderMode === "limit"
   ? calcLimitOrderPrepay(action, priceWei, amountWei)
   :0n;
 const limitOrderIsYes = calcLimitOrderBookSide(action, isYes);
  const buyMaxCost: bigint = action === "buy" && orderMode === "market" && collateral >0
  ? calcBufferedMaxCost(collateralAmount)
   :0n;
 const approvalKind = calcTradeApprovalKind(action, orderMode);
 const marketPrepay: bigint = orderMode === "market" && approvalKind === "usdc" ? calcMarketPrepay(amountWei) :0n;
 // approve 金额:买入用 USDC; 卖出(市价/限价)走 CTF setApprovalForAll
 const approveAmt: bigint = approvalKind === "usdc" ? (orderMode === "limit" ? placeOrderCost : marketPrepay) :0n;

  // ── Approval check ──────────────────────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: { enabled: isConnected && !!user && !!marketAddr && approvalKind === "usdc" && approveAmt > 0n },
  });

 const currentAllowance: bigint = (allowance as bigint | undefined) ??0n;
 const needsUsdcApproval = isConnected && !!user && approveAmt >0n && currentAllowance < approveAmt;

  const { data: shareTransferApproved, refetch: refetchShareApproval } = useReadContract({
    address: conditionalTokensAddr as `0x${string}`,
    abi: CONDITIONAL_TOKENS_OPERATOR_ABI,
    functionName: "isApprovedForAll",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: { enabled: isConnected && !!user && approvalKind === "shares" && !!conditionalTokensAddr && !!marketAddr },
  });
 const needsShareApproval = isConnected && !!user && approvalKind === "shares" && shareTransferApproved === false;
 const needsApproval = needsUsdcApproval || needsShareApproval;

  // ── Approval mutation ───────────────────────────────────────────────────────
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  useEffect(() => {
    if (!approveTxHash) return;
    if (isApproving) showPending(approveTxHash, needsShareApproval ? "Approve Shares" : "Approve USDC");
  }, [approveTxHash, isApproving, needsShareApproval]);

 useEffect(() => {
 if (!approveTxHash || !approveSuccess) return;
 showSuccess("Approved", approveTxHash);
 refetchAllowance();
 refetchShareApproval();
 // 授权成功后自动触发下单
 handleOrder();
 }, [approveTxHash, approveSuccess]);

  // ── Order mutation ───────────────────────────────────────────────────────────
  const { writeContract: writeOrder, data: orderTxHash, isPending: isOrderPending } = useWriteContract();
  const { isLoading: isOrdering, isSuccess: orderSuccess, isError: orderError } = useWaitForTransactionReceipt({ hash: orderTxHash });

  useEffect(() => {
    if (!orderTxHash) return;
    if (isOrdering) showPending(orderTxHash, `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`);
  }, [orderTxHash, isOrdering]);

  useEffect(() => {
    if (!orderTxHash || !orderSuccess) return;
    showSuccess(`${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`, orderTxHash);
    setCollateralInput("");
    setLimitPriceInput("");
    refetchAllowance();
    refetchUserYesBalance();
    refetchUserNoBalance();
  }, [orderTxHash, orderSuccess]);

  useEffect(() => {
    if (!orderTxHash || !orderError) return;
    showError("Order failed");
  }, [orderTxHash, orderError]);

 const handleApprove = () => {
 if (needsShareApproval) {
 console.log("[Approve] ConditionalTokens.setApprovalForAll args:", {
 operator: marketAddr,
 approved: true,
  });
  writeApprove({
  address: conditionalTokensAddr as `0x${string}`,
  abi: CONDITIONAL_TOKENS_OPERATOR_ABI,
  functionName: "setApprovalForAll",
  args: [marketAddr as `0x${string}`, true],
  });
  return;
 }
 console.log("[Approve] ERC20.approve args:", {
 spender: marketAddr,
 value: approveAmt.toString(),
 valueDecimal: unitsToNumber(approveAmt, collateralDecimals),
  });
  writeApprove({
  address: collateralAddr as `0x${string}`,
 abi: ERC20_ABI,
 functionName: "approve",
 args: [marketAddr as `0x${string}`, approveAmt],
 });
 };

 // isYes = side === "yes" (determines which outcome position is bought/sold)
 //
 // 合约调用矩阵(全部 amount 是 CTF shares, 精度跟 collateral decimals 一致):
 //   buy + market → Market.buyShares(isYes, amount, maxCost, fillOrKill)  // 链上 view 预读 + 滑点保护
 //   buy + limit  → Market.placeOrder(isYes, price, amount) 锁 USDC 挂买单
 //   sell + limit → Market.placeSellOrder(isYes, price, amount) 托管 CTF 挂卖单
 //   sell + market → Market.sellShares(isYes, amount, minReceive)  // 撮合 + burn 配对 1:1 退 USDC
 //
 // 重要约束:
  //   - placeOrder 只能锁 USDC 挂买单; placeSellOrder 才是已有份额限价卖出
  //   - sellShares amount=collateral decimals, minReceive=collateral decimals
  //   - buyShares amount=collateral decimals, maxCost=collateral decimals, fillOrKill 控制是否必须吃满
 //   - buyShares 内部走 fillOrders + 链上 OB.getFills 预读做滑点守门,比直接调 fillOrders 更安全

 // maxCostWei: 用户愿意为买 amount 份 CTF 出的最多抵押物(滑点保护, ERC20 decimals)
 // buyShares 内部:
 //   1. 链上 view 预读 OB.getFills(isYes, 5e17, amount) 算出 previewCost
 //   2. previewCost > maxCost → revert "M: buyShares preview cost > maxCost"
 //   3. 撮合完成后链上兜底再校验一次
 // 我们直接用用户输入 USDC × 1.1 作为 maxCost(合约测试 buyShares(true, p("1"), p("0.5"), false) 模式)
 const maxCostWei: bigint = buyMaxCost;
 // fillOrKill: false = 允许部分成交(true 会更激进,但失败概率高,UX 不友好)
 const fillOrKill = false;

 // minReceive: 卖 N 份 isYes 时用户期望最少拿到的抵押物(滑点保护, ERC20 decimals)
 // sellShares 净收入 = mergeAmount - cost ≈ amount × (1 - 对手 bestAsk)
 // 留 10% 滑点:minReceive = expectedReceive × 0.9
  const minReceiveWei: bigint = action === "sell"
  ? calcMarketSellMinReceive(amountWei, sellCostPriceWei)
  :0n;

// sell 校验: amount 不能超过用户当前持仓。限价卖出前端按对侧挂单表达，也必须符合卖出意图。
const sellOverflow = action === "sell" && userShareBig !== undefined && amountWei > (userShareBig ?? 0n);

  const handleOrder = () => {
  if (orderMode === "limit") {
  const limitFunctionName = action === "sell" ? "placeSellOrder" : "placeOrder";
  const limitArgs = action === "sell"
   ? [isYes, priceWei, amountWei]
   : [limitOrderIsYes, priceWei, amountWei];
  // Maker: buy uses placeOrder (locks USDC), sell uses placeSellOrder (escrows CTF shares).
  // 合约语义: price 是 1e18 价格, amount 是 collateral decimals 数量
  console.log(`[${limitFunctionName}]`, {
  chain: chainId,
  contract: "Market",
  address: marketAddr,
  selector: `${limitFunctionName}(bool,uint128,uint128)`,
  orderIntent: action,
  arg0_isYes: action === "sell" ? isYes : limitOrderIsYes,
  outcomeSide: isYes ? "YES" : "NO",
  bookSide: limitOrderIsYes ? "YES" : "NO",
  arg1_price: priceWei.toString(),
  arg1_priceDecimal: Number(priceWei) /1e18,
  arg2_amount: amountWei.toString(),
  arg2_amountDecimal_CTF: unitsToNumber(amountWei, collateralDecimals),
  // 限价买入预付 collateral = price * amount / 1e18; 限价卖出托管 shares
  expectedCost: placeOrderCost.toString(),
  expectedCostDecimal: unitsToNumber(placeOrderCost, collateralDecimals),
  });
  try {
  writeOrder({
  abi: ABIs.Market as any,
  address: marketAddr as `0x${string}`,
  functionName: limitFunctionName,
  args: limitArgs,
  });
  } catch (err) {
  console.error(`[${limitFunctionName} Error]`, err);
  const msg = (err as any)?.shortMessage || (err as any)?.message || "Order failed";
  showError(msg);
  }
  } else if (action === "sell") {
  // Taker 市价卖出: Market.sellShares(bool isYes, uint128 amount, uint128 minReceive)
  // amount = collateral decimals (用户想卖的份数), minReceive = collateral decimals
  // 合约内部: 撮合 !isYes 卖单 → burn isYes + !isYes → 退 amount USDC → 净 = amount - cost
  console.log("[sellShares]", {
  chain: chainId,
  contract: "Market",
  address: marketAddr,
  selector: "0x sellShares(bool,uint128,uint128)",
  arg0_isYes: isYes,
  arg1_amount: amountWei.toString(),
  arg1_amountDecimal_CTF: unitsToNumber(amountWei, collateralDecimals),
  arg2_minReceive: minReceiveWei.toString(),
  arg2_minReceiveDecimal: unitsToNumber(minReceiveWei, collateralDecimals),
  //前端预计净收入(USDC) = amount × (1 - 对手 bestAsk)
  expectedNetReceive: expectedReceive.toString ? expectedReceive.toString() : "0",
  expectedNetReceiveDecimal: unitsToNumber(expectedReceive, collateralDecimals),
  //用户当前持仓
  userShareSide: userShareBig?.toString() ?? "0",
  userShareSideDecimal: userShareBig ? unitsToNumber(userShareBig, collateralDecimals) :0,
  //市价单参考价
  refPrice_BestAsk: liveBestAsk?.toString() ?? "0",
  refPrice_BestAsk_decimal: liveBestAsk ? Number(liveBestAsk) /1e18 :0,
  refPrice_BestBid: liveBestBid?.toString() ?? "0",
  refPrice_BestBid_decimal: liveBestBid ? Number(liveBestBid) /1e18 :0,
  });
  try {
  writeOrder({
  abi: ABIs.Market as any,
  address: marketAddr as `0x${string}`,
  functionName: "sellShares",
  args: [isYes, amountWei, minReceiveWei],
  });
  } catch (err) {
  console.error("[sellShares Error]", err);
  const msg = (err as any)?.shortMessage || (err as any)?.message || "Order failed";
  showError(msg);
  }
  } else {
  // Taker 市价买入: Market.buyShares(bool isYes, uint128 amount, uint128 maxCost, bool fillOrKill)
  // amount = collateral decimals (想买的份数)
  // maxCost = collateral decimals (滑点保护, 留 10% 缓冲)
  // fillOrKill = false (允许部分成交)
  // 合约内部:链上 view OB.getFills(isYes, 5e17, amount) 预读 → previewCost > maxCost revert → 撮合
  // isYes=true → 买 YES 吃 NO 卖单(从 bestAsk 往上扫)
  // isYes=false → 买 NO 吃 YES 买单(从 bestBid 往下扫)
  console.log("[buyShares]", {
  chain: chainId,
  contract: "Market",
  address: marketAddr,
  selector: "0x buyShares(bool,uint128,uint128,bool)",
  arg0_isYes: isYes,
  arg1_amount: amountWei.toString(),
  arg1_amountDecimal_CTF: unitsToNumber(amountWei, collateralDecimals),
  arg2_maxCost: maxCostWei.toString(),
  arg2_maxCostDecimal_USDC: unitsToNumber(maxCostWei, collateralDecimals),
  arg3_fillOrKill: fillOrKill,
  //前端预期撮合成本 = 用户输入的抵押物金额
  expectedCost_userInput: (action === "buy" && orderMode === "market" && collateral >0)
   ? collateralAmount.toString()
   : "0",
  expectedCost_userInputDecimal: unitsToNumber(collateralAmount, collateralDecimals),
  //市价单参考价(来自链上)
  refPrice_BestAsk_NO: liveBestAsk?.toString() ?? "0",
  refPrice_BestAsk_NO_decimal: liveBestAsk ? Number(liveBestAsk) /1e18 :0,
  refPrice_BestBid_YES: liveBestBid?.toString() ?? "0",
  refPrice_BestBid_YES_decimal: liveBestBid ? Number(liveBestBid) /1e18 :0,
  });
  try {
  writeOrder({
  abi: ABIs.Market as any,
  address: marketAddr as `0x${string}`,
  functionName: "buyShares",
  args: [isYes, amountWei, maxCostWei, fillOrKill],
  });
  } catch (err) {
  console.error("[buyShares Error]", err);
  const msg = (err as any)?.shortMessage || (err as any)?.message || "Order failed";
  showError(msg);
  }
  }
  };

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!isConnected || isResolved) return;

  // 限价买入/市价单检查 USDC 预付; 限价卖出检查 CTF 托管授权。
  if (orderMode === "limit" && amountWei <=0n) return;
  if (action === "buy" && orderMode === "limit" && approveAmt <=0n) return;
  if (action === "buy" && orderMode === "market" && approveAmt <=0n) return;
  if (action === "sell" && orderMode === "market" && amountWei <=0n) return;
  if (action === "sell" && sellOverflow) {
   showError(`Insufficient ${side.toUpperCase()} shares. You have ${userShareSide.toFixed(4)}, trying to sell ${collateral.toFixed(4)}.`);
   return;
  }

  if (action === "buy" && orderMode === "market" && noLiquidity) {
   showError("No liquidity for this outcome");
   return;
  }

  if (needsApproval) {
   handleApprove();
  } else {
   handleOrder();
  }
  };

  // Determine button state
  const isPending = isApprovePending || isApproving || isOrderPending || isOrdering;
  const needsApprove = needsApproval;
 const showApprove = needsApprove;
 const invalidLimitPrice = orderMode === "limit" && (limitPrice <0.002 || limitPrice >0.5);

 const submitDisabled =
  !isConnected
  || (action === "buy" && collateral <=0)
  || (action === "sell" && collateral <=0)
  || invalidLimitPrice
  || (action === "buy" && orderMode === "market" && noLiquidity)
  || (action === "sell" && sellOverflow)
  || (action === "sell" && userShareBig !== undefined && userShareBig ===0n)
  || isPending
  || isResolved;

 let buttonLabel = "";
 if (isPending) {
   buttonLabel = isApproving ? "Approving..." : isOrdering ? "Confirming..." : showApprove ? "Approve & Order" : "Confirming...";
 } else if (isResolved) {
   buttonLabel = "Market Resolved";
 } else if (!isConnected) {
  buttonLabel = "Connect Wallet";
  } else if (action === "sell" && userShareBig ===0n) {
   buttonLabel = `No ${side.toUpperCase()} Shares`;
 } else if (invalidLimitPrice) {
  buttonLabel = "Invalid Price";
 } else if (action === "buy" && orderMode === "market" && noLiquidity) {
  buttonLabel = "No Liquidity";
  } else if (showApprove) {
   buttonLabel = needsShareApproval ? "Approve Shares" : "Approve USDC";
 } else if (orderMode === "limit") {
  buttonLabel = `Place ${side.toUpperCase()} Limit`;
 } else {
  buttonLabel = `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`;
 }

 const errMsg = "";
 const effectivePrice = action === "buy" ? priceForCalc : (1 - priceForCalc);

 const plPreview = (() => {
  if (collateral <= 0) return null;
  if (action === "buy") {
   return isYes ? collateral / priceForCalc : 0;
  } else {
   // 卖出:input 是份数, 净收入 ≈ amount × (1 - 对手价)
   return unitsToNumber(expectedReceive, collateralDecimals);
  }
 })();

  const yesNoOptions = [
 { value: "yes", label: "YES" },
 { value: "no", label: "NO" },
 ];

 const orderTypeOptions = [
 { value: "market", label: "Market Order" },
 { value: "limit", label: "Limit Order" },
 ];

 return (
    <>
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>

        {/* Header: BEST PRICE —实时来自链上 */}
 <div style={{
 padding: "14px18px12px",
 borderBottom: "1px solid var(--border)",
 background: "var(--bg-elevated)",
 display: "flex", alignItems: "center", justifyContent: "space-between",
 }}>
 <div style={{ display: "flex", alignItems: "center", gap:6 }}>
 <div style={{ textAlign: "center" }}>
 <div style={{ fontSize:22, fontWeight:800, color: "var(--yes)", fontFamily: "'JetBrains Mono', monospace", lineHeight:1.1 }}>
 {bestBidYesPercent !== null ? formatProbabilityPercent(bestBidYesPercent) : "—"}
 </div>
 <div style={{ fontSize:9, fontWeight:600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>YES bid</div>
 </div>
 <div style={{ width:1, height:28, background: "var(--border)" }} />
 <div style={{ textAlign: "center" }}>
 <div style={{ fontSize:22, fontWeight:800, color: "var(--no)", fontFamily: "'JetBrains Mono', monospace", lineHeight:1.1 }}>
 {bestAskNoPercent !== null ? formatProbabilityPercent(bestAskNoPercent) : "—"}
 </div>
 <div style={{ fontSize:9, fontWeight:600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>NO ask</div>
 </div>
 </div>
 </div>

        {/* BUY / SELL toggle */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid var(--border)",
        }}>
          {(["buy", "sell"] as TradeAction[]).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              style={{
                padding: "11px 0",
                fontSize: 13, fontWeight: 700,
                border: "none",
                borderBottom: action === a ? `2.5px solid ${a === "buy" ? "var(--yes)" : "var(--no)"}` : "2.5px solid transparent",
                background: "transparent",
                color: action === a ? (a === "buy" ? "var(--yes)" : "var(--no)") : "var(--text-tertiary)",
                cursor: "pointer",
                transition: "all 150ms",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: "inherit",
              }}
            >
              {a === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* YES / NO selector */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
              Outcome
            </label>
            <CustomSelect
              value={side}
              options={yesNoOptions}
              onChange={v => setSide(v as TradeSide)}
              disabled={isResolved}
              accentColor={sideColor}
            />
          </div>

          {/* User Balance Display —实时显示用户 YES/NO 持仓 */}
          <div style={{
           display: "flex", justifyContent: "space-between", alignItems: "center",
           padding: "8px 12px", borderRadius: 10,
           background: "var(--bg-elevated)", border: "1px solid var(--border)",
           fontSize: 12,
          }}>
           <span style={{ color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Balance</span>
           <div style={{ display: "flex", gap: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: "var(--yes)", fontWeight: 700 }}>
             {userShareYes >0 ? userShareYes.toFixed(4) : "0"} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>YES</span>
            </span>
            <span style={{ color: "var(--no)", fontWeight: 700 }}>
             {userShareNo >0 ? userShareNo.toFixed(4) : "0"} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>NO</span>
            </span>
           </div>
          </div>

          {/* Order type */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
              Order Type
            </label>
            <CustomSelect
              value={orderMode}
              options={orderTypeOptions}
              onChange={v => setOrderMode(v as "market" | "limit")}
              disabled={isResolved}
            />
          </div>

          {/* Amount — 买入为 USDC,卖出为份额数 */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
              {orderMode === "limit"
               ? `Shares to place (${side.toUpperCase()})`
               : action === "buy"
               ? `You pay (USDC)`
               : `Shares to sell (${side.toUpperCase()})`}
              {action === "sell" && userShareBig !== undefined && (
               <span style={{ color: "var(--text-tertiary)", fontWeight: 500, marginLeft: 6 }}>
                · avail {userShareSide.toFixed(4)}
               </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number" step={orderMode === "limit" || action === "sell" ? "0.0001" : "0.01"} min="0"
                value={collateralInput}
                onChange={e => setCollateralInput(e.target.value)}
                placeholder={orderMode === "limit" || action === "sell" ? "0" : "0.00"}
                disabled={isResolved}
                className="input"
                style={{ fontSize: 16, fontWeight: 600, padding: "10px 52px 10px 14px", textAlign: "right" }}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
               {orderMode === "limit" || action === "sell" ? `${side.toUpperCase()}` : "USDC"}
              </span>
            </div>
            {action === "sell" && userShareBig !== undefined && userShareBig >0n && collateral >0 && (
             <button type="button" onClick={() => setCollateralInput(String(userShareSide))}
              style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              Max
             </button>
            )}
          </div>

          {/* Limit price */}
          {orderMode === "limit" && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
                Limit Price <span style={{ color: "var(--text-tertiary)" }}>(0.002 – 0.5)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number" step="0.002" min="0.002" max="0.5"
                  value={limitPriceInput}
                  onChange={e => setLimitPriceInput(e.target.value)}
                  placeholder="0.50"
                  disabled={isResolved}
                  className="input"
                  style={{ fontSize: 16, fontWeight: 600, padding: "10px 52px 10px 14px", textAlign: "right" }}
                />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>USDC</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {[0.25, 0.4, 0.5].map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setLimitPriceInput(String(p))}
                    style={{
                      flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {p * 100}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={{
           background: "var(--bg-elevated)", borderRadius: 12, padding: "12px 14px",
           display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--border)",
          }}>
           {orderMode === "limit" ? (
            <>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>You place</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: sideColor }}>
               {amountWei >0n ? `${unitsToNumber(amountWei, collateralDecimals).toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
              </span>
             </div>
             <div style={{ height: 1, background: "var(--border)" }} />
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{action === "sell" ? "Receive if filled" : "Locked collateral"}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
               {action === "sell"
                ? (limitSellReceive >0n ? `${unitsToNumber(limitSellReceive, collateralDecimals).toFixed(4)} USDC` : "— USDC")
                : (placeOrderCost >0n ? `${unitsToNumber(placeOrderCost, collateralDecimals).toFixed(4)} USDC` : "— USDC")}
              </span>
             </div>
            </>
           ) : action === "buy" ? (
            <>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>You pay</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
               {collateral > 0 ? `${collateral.toFixed(4)} USDC` : "— USDC"}
              </span>
             </div>
             <div style={{ height: 1, background: "var(--border)" }} />
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>You receive</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: sideColor }}>
               {expectedCtf >0 ? `${expectedCtf.toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
              </span>
             </div>
            </>
           ) : (
            <>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>You sell</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: sideColor }}>
               {amountWei >0n ? `${unitsToNumber(amountWei, collateralDecimals).toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
              </span>
             </div>
             <div style={{ height: 1, background: "var(--border)" }} />
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>You receive ≈</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
               {expectedReceive >0n ? `${unitsToNumber(expectedReceive, collateralDecimals).toFixed(4)} USDC` : "— USDC"}
              </span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Min receive (slippage 10%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, color: "var(--text-tertiary)" }}>
               {minReceiveWei >0n ? `${unitsToNumber(minReceiveWei, collateralDecimals).toFixed(4)} USDC` : "— USDC"}
              </span>
             </div>
            </>
           )}
           {orderMode === "limit" && limitPrice > 0 && action === "buy" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Effective price</span>
             <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, color: "var(--text-tertiary)" }}>
              ${effectivePrice.toFixed(4)}
             </span>
            </div>
           )}
           {orderMode !== "limit" && collateral > 0 && plPreview !== null && (
            <div style={{
             background: isYes ? "var(--yes-light)" : "var(--no-light)",
             borderRadius: 8, padding: "6px 10px",
             display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
             <span style={{ fontSize: 11, fontWeight: 600, color: sideColor }}>
              {action === "buy" ? "If YES wins" : "Net receive"}
             </span>
             <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: sideColor }}>
              {plPreview >= 0 ? `+${plPreview.toFixed(4)}` : `${plPreview.toFixed(4)}`} USDC
             </span>
            </div>
           )}
          {action === "sell" && sellOverflow && (
            <div style={{
             background: "rgba(220,38,38,0.08)",
             borderRadius: 8, padding: "6px 10px",
             fontSize: 11, fontWeight: 600, color: "var(--no)",
            }}>
             Insufficient shares — try ≤ {userShareSide.toFixed(4)}
            </div>
           )}
           {showApprove && collateral > 0 && (
            <div style={{
             background: "rgba(251,191,36,0.08)",
             borderRadius: 8, padding: "6px 10px",
             fontSize: 11, fontWeight: 600, color: "#fbbf24",
            }}>
             Approval required before placing order
            </div>
           )}
          </div>

          {/* Error */}
          {errMsg && (
            <div style={{
              fontSize: 11, color: "var(--no)", background: "var(--no-light)",
              border: "1px solid var(--no-border)", borderRadius: 8, padding: "8px 10px",
            }}>
              {errMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, fontWeight: 700, fontSize: 14,
              border: "none", cursor: submitDisabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 150ms",
              background: isPending ? "var(--text-tertiary)" : needsApprove ? "#fbbf24" : sideBg,
              color: isPending ? "white" : needsApprove ? "#000" : "white",
              opacity: submitDisabled ? 0.45 : 1,
              boxShadow: submitDisabled ? "none" : `0 3px 12px ${needsApprove ? "rgba(251,191,36,0.3)" : isYes ? "rgba(26,127,90,0.3)" : "rgba(201,98,111,0.3)"}`,
              fontFamily: "inherit",
            }}
          >
            {isPending ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {buttonLabel}</>
            ) : buttonLabel}
          </button>
        </form>
      </div>
    </>
  );
}
