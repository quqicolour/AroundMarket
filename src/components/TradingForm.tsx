import { useState, useEffect, useRef } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { ABIs } from "../abis";
import { Loader2, ChevronDown } from "lucide-react";
import { useTxToast } from "./TxToastContext";
import { CONDITIONAL_TOKENS_OPERATOR_ABI, CONDITIONAL_TOKENS_POSITION_ABI } from "../config/contractAbis";
import { erc20Abi } from "viem";
import {
  calcBufferedMaxCost,
  calcBuyShareAmount,
  calcLimitOrderPrepay,
  calcLimitOrderBookSide,
  calcLimitShareAmount,
  calcMarketBuyApproval,
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
import { bestAsk, bestBid, bestCollateralBuyPrice, bestShareSellPrice, useSubgraphMarketOrders } from "../utils/subgraph";

const ERC20_ABI = erc20Abi;

interface Props {
  marketData: readonly [string, string, string, string, string, string, string, bigint, bigint, boolean, number];
  marketId: number;
  initialSide?: "yes" | "no";
  balanceRefreshSignal?: number;
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 38px 10px 14px",
          borderRadius: "var(--r-md)",
          border: `1.5px solid ${open ? (accentColor ?? "var(--primary)") : "var(--border)"}`,
          background: "var(--bg-elevated)",
          color: accentColor ?? "var(--text-primary)",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          textAlign: "left",
          transition: "border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          aria-hidden="true"
          style={{ color: "var(--text-tertiary)", transition: "transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            padding: 4,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--r-sm)",
                border: "none",
                background: "transparent",
                color: opt.value === value ? (accentColor ?? "var(--primary)") : "var(--text-primary)",
                fontSize: 13,
                fontWeight: opt.value === value ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background var(--t-fast) var(--ease)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-overlay)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
export default function TradingForm({ marketData, marketId, initialSide = "yes", balanceRefreshSignal = 0 }: Props) {
  const { showPending, showSuccess, showError } = useTxToast();
  const { isConnected, address: user } = useAccount();
  const chainId = useChainId();

  const [action, setAction] = useState<TradeAction>("buy");
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [orderMode, setOrderMode] = useState<"market" | "limit">("market");
  const [collateralInput, setCollateralInput] = useState("");
  const [limitPriceInput, setLimitPriceInput] = useState("");

  const marketAddr = marketData[1] as string;
  const collateralAddr = marketData[2] as string;
  const conditionId = marketData[6] as `0x${string}`;
  const isResolved = marketData[9] as boolean;
  const conditionalTokensAddr = marketData[3] as string;
  const marketFeeRate = BigInt(marketData[10] ?? 0n);

  const { data: collateralDecimalsRaw } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });
  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);

  const collateral = parseFloat(collateralInput) || 0;
  const limitPrice = parseFloat(limitPriceInput) || 0;
  const collateralAmount = decimalToUnits(collateralInput, collateralDecimals);
  const limitPriceWei = decimalToWei(limitPriceInput);
  const isYes = side === "yes";

  const { data: graphOrders = [] } = useSubgraphMarketOrders(marketId);
  const liveBestBidBig = bestBid(graphOrders);
  const liveBestAskBig = bestAsk(graphOrders);
  const bestYesCollateralBuyBig = bestCollateralBuyPrice(graphOrders, "YES");
  const bestNoCollateralBuyBig = bestCollateralBuyPrice(graphOrders, "NO");
  const bestYesShareSellBig = bestShareSellPrice(graphOrders, "YES");
  const bestNoShareSellBig = bestShareSellPrice(graphOrders, "NO");

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

  useEffect(() => {
    if (balanceRefreshSignal <= 0) return;
    refetchUserYesBalance();
    refetchUserNoBalance();
  }, [balanceRefreshSignal]);

  const bestBidYesPercent = liveBestBidBig && liveBestBidBig > 0n ? priceWeiToPercent(liveBestBidBig) : null;
  const bestAskNoPercent = liveBestAskBig && liveBestAskBig > 0n ? priceWeiToPercent(liveBestAskBig) : null;
  const buyRefPriceWei = isYes ? bestYesShareSellBig : bestNoShareSellBig;
  const buyRefPrice = buyRefPriceWei && buyRefPriceWei > 0n ? weiToNumber(buyRefPriceWei) : 0;
  const sellCostPriceWei = calcMarketSellCostPrice(isYes, bestYesCollateralBuyBig, bestNoCollateralBuyBig);
  const sellCostPrice = sellCostPriceWei > 0n ? weiToNumber(sellCostPriceWei) : 0;
  const refPrice = action === "sell" ? sellCostPrice : buyRefPrice;
  const priceForCalc = orderMode === "market" && refPrice > 0 ? refPrice : (limitPrice > 0 ? limitPrice : MOCK_PRICE_YES);

  const noLiquidity = orderMode === "market" && action === "buy" && isConnected && buyRefPrice === 0;
  const noSellLiquidity = orderMode === "market" && action === "sell" && isConnected && sellCostPriceWei === 0n;

  const sideColor = isYes ? "var(--yes)" : "var(--no)";

  const amountWei = (() => {
    if (collateralAmount <= 0n) return 0n;
    if (orderMode === "limit") return calcLimitShareAmount(collateralAmount);
    if (action === "sell") return collateralAmount;
    const calcPriceWei = buyRefPriceWei ?? 0n;
    return calcBuyShareAmount(collateralAmount, calcPriceWei);
  })();

  const expectedCtf = orderMode === "limit" && amountWei > 0n
    ? unitsToNumber(amountWei, collateralDecimals)
    : action === "buy" && collateral > 0 && priceForCalc > 0
    ? collateral / priceForCalc
    : 0;

  const expectedReceive: bigint = action === "sell" && amountWei > 0n && sellCostPrice > 0
    ? (amountWei * sellCostPriceWei) / (10n ** 18n)
    : 0n;

  const priceWei = (() => {
    if (orderMode === "limit") return limitPriceWei;
    if (action === "sell") return sellCostPriceWei;
    const ref = isYes ? liveBestAskBig : liveBestBidBig;
    return ref && ref > 0n ? ref : 0n;
  })();
  const limitSellReceive: bigint = action === "sell" && orderMode === "limit" && amountWei > 0n && priceWei > 0n
    ? (amountWei * priceWei) / (10n ** 18n)
    : 0n;

  const placeOrderCost: bigint = orderMode === "limit" ? calcLimitOrderPrepay(action, priceWei, amountWei) : 0n;
  const limitOrderIsYes = calcLimitOrderBookSide(action, isYes);
  const buyMaxCost: bigint = action === "buy" && orderMode === "market" && collateral > 0 ? calcBufferedMaxCost(collateralAmount) : 0n;
  const approvalKind = calcTradeApprovalKind(action, orderMode);
  const marketPrepay: bigint = orderMode === "market" && approvalKind === "usdc" ? calcMarketBuyApproval(buyMaxCost, marketFeeRate) : 0n;
  const approveAmt: bigint = approvalKind === "usdc" ? (orderMode === "limit" ? placeOrderCost : marketPrepay) : 0n;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: { enabled: isConnected && !!user && !!marketAddr && approvalKind === "usdc" && approveAmt > 0n },
  });
  const currentAllowance: bigint = (allowance as bigint | undefined) ?? 0n;
  const needsUsdcApproval = isConnected && !!user && approveAmt > 0n && currentAllowance < approveAmt;

  const { data: shareTransferApproved, refetch: refetchShareApproval } = useReadContract({
    address: conditionalTokensAddr as `0x${string}`,
    abi: CONDITIONAL_TOKENS_OPERATOR_ABI,
    functionName: "isApprovedForAll",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: { enabled: isConnected && !!user && approvalKind === "shares" && !!conditionalTokensAddr && !!marketAddr },
  });
  const needsShareApproval = isConnected && !!user && approvalKind === "shares" && shareTransferApproved === false;
  const needsApproval = needsUsdcApproval || needsShareApproval;

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
    handleOrder();
  }, [approveTxHash, approveSuccess]);

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

  const maxCostWei: bigint = buyMaxCost;
  const fillOrKill = false;
  const minReceiveWei: bigint = action === "sell" ? calcMarketSellMinReceive(amountWei, sellCostPriceWei) : 0n;
  const sellOverflow = action === "sell" && userShareBig !== undefined && amountWei > (userShareBig ?? 0n);

  const handleOrder = () => {
    if (orderMode === "limit") {
      const limitFunctionName = action === "sell" ? "placeSellOrder" : "placeOrder";
      const limitArgs = action === "sell" ? [isYes, priceWei, amountWei] : [limitOrderIsYes, priceWei, amountWei];
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
        arg1_priceDecimal: Number(priceWei) / 1e18,
        arg2_amount: amountWei.toString(),
        arg2_amountDecimal_CTF: unitsToNumber(amountWei, collateralDecimals),
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
        expectedNetReceive: expectedReceive.toString ? expectedReceive.toString() : "0",
        expectedNetReceiveDecimal: unitsToNumber(expectedReceive, collateralDecimals),
        userShareSide: userShareBig?.toString() ?? "0",
        userShareSideDecimal: userShareBig ? unitsToNumber(userShareBig, collateralDecimals) : 0,
        refPrice_BestYesCollateralBuy: bestYesCollateralBuyBig?.toString() ?? "0",
        refPrice_BestYesCollateralBuy_decimal: bestYesCollateralBuyBig ? Number(bestYesCollateralBuyBig) / 1e18 : 0,
        refPrice_BestNoCollateralBuy: bestNoCollateralBuyBig?.toString() ?? "0",
        refPrice_BestNoCollateralBuy_decimal: bestNoCollateralBuyBig ? Number(bestNoCollateralBuyBig) / 1e18 : 0,
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
        expectedCost_userInput: (action === "buy" && orderMode === "market" && collateral > 0) ? collateralAmount.toString() : "0",
        expectedCost_userInputDecimal: unitsToNumber(collateralAmount, collateralDecimals),
        refPrice_BestAsk_NO: liveBestAskBig?.toString() ?? "0",
        refPrice_BestAsk_NO_decimal: liveBestAskBig ? Number(liveBestAskBig) / 1e18 : 0,
        refPrice_BestBid_YES: liveBestBidBig?.toString() ?? "0",
        refPrice_BestBid_YES_decimal: liveBestBidBig ? Number(liveBestBidBig) / 1e18 : 0,
        refPrice_BestShareSell_YES: bestYesShareSellBig?.toString() ?? "0",
        refPrice_BestShareSell_YES_decimal: bestYesShareSellBig ? Number(bestYesShareSellBig) / 1e18 : 0,
        refPrice_BestShareSell_NO: bestNoShareSellBig?.toString() ?? "0",
        refPrice_BestShareSell_NO_decimal: bestNoShareSellBig ? Number(bestNoShareSellBig) / 1e18 : 0,
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

    if (orderMode === "limit" && amountWei <= 0n) return;
    if (action === "buy" && orderMode === "limit" && approveAmt <= 0n) return;
    if (action === "buy" && orderMode === "market" && approveAmt <= 0n) return;
    if (action === "sell" && orderMode === "market" && amountWei <= 0n) return;
    if (action === "sell" && sellOverflow) {
      showError(`Insufficient ${side.toUpperCase()} shares. You have ${userShareSide.toFixed(4)}, trying to sell ${collateral.toFixed(4)}.`);
      return;
    }
    if (action === "buy" && orderMode === "market" && noLiquidity) {
      showError("No liquidity for this outcome");
      return;
    }
    if (action === "sell" && orderMode === "market" && noSellLiquidity) {
      showError(`No buy orders available for ${side.toUpperCase()} shares`);
      return;
    }
    if (needsApproval) {
      handleApprove();
    } else {
      handleOrder();
    }
  };

  const isPending = isApprovePending || isApproving || isOrderPending || isOrdering;
  const showApprove = needsApproval;

  const submitDisabled =
    !isConnected
    || (action === "buy" && collateral <= 0)
    || (action === "sell" && collateral <= 0)
    || (action === "buy" && orderMode === "market" && noLiquidity)
    || (action === "sell" && orderMode === "market" && noSellLiquidity)
    || (action === "sell" && sellOverflow)
    || (action === "sell" && userShareBig !== undefined && userShareBig === 0n)
    || isPending
    || isResolved;

  let buttonLabel = "";
  if (isPending) {
    buttonLabel = isApproving ? "Approving..." : isOrdering ? "Confirming..." : showApprove ? "Approve & Order" : "Confirming...";
  } else if (isResolved) {
    buttonLabel = "Market Resolved";
  } else if (!isConnected) {
    buttonLabel = "Connect Wallet";
  } else if (action === "sell" && userShareBig === 0n) {
    buttonLabel = `No ${side.toUpperCase()} Shares`;
  } else if (action === "buy" && orderMode === "market" && noLiquidity) {
    buttonLabel = "No Liquidity";
  } else if (action === "sell" && orderMode === "market" && noSellLiquidity) {
    buttonLabel = `No ${side.toUpperCase()} Buy Orders`;
  } else if (showApprove) {
    buttonLabel = needsShareApproval ? "Approve Shares" : "Approve USDC";
  } else if (orderMode === "limit") {
    buttonLabel = `Place ${side.toUpperCase()} Limit`;
  } else {
    buttonLabel = `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`;
  }

  const effectivePrice = action === "buy" ? priceForCalc : (1 - priceForCalc);
  const plPreview = (() => {
    if (collateral <= 0) return null;
    if (action === "buy") return isYes ? collateral / priceForCalc : 0;
    return unitsToNumber(expectedReceive, collateralDecimals);
  })();

  const yesNoOptions = [
    { value: "yes", label: "YES" },
    { value: "no", label: "NO" },
  ];

  const orderTypeOptions = [
    { value: "market", label: "Market Order" },
    { value: "limit", label: "Limit Order" },
  ];

  // Submit button style: buy=emerald, sell=rose, approve=warning
  const submitClass = showApprove
    ? "btn btn-warning btn-block btn-lg"
    : action === "buy"
    ? "btn btn-yes btn-block btn-lg"
    : "btn btn-no btn-block btn-lg";

  return (
    <div className="card trade-card">
      {/* BEST PRICE HEADER */}
      <div className="trade-card-head">
        <div className="trade-card-best">
          <div>
            <div className="price yes">
              {bestBidYesPercent !== null ? formatProbabilityPercent(bestBidYesPercent) : "—"}
            </div>
            <div className="label">YES bid</div>
          </div>
          <div className="divider" aria-hidden="true" />
          <div>
            <div className="price no">
              {bestAskNoPercent !== null ? formatProbabilityPercent(bestAskNoPercent) : "—"}
            </div>
            <div className="label">NO ask</div>
          </div>
        </div>
      </div>

      {/* BUY / SELL */}
      <div className="trade-card-segment" role="tablist" aria-label="Trade action">
        {(["buy", "sell"] as TradeAction[]).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={action === a}
            onClick={() => setAction(a)}
            className={action === a ? `active ${a}` : ""}
          >
            {a === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="trade-card-body">
        {/* OUTCOME */}
        <div className="trade-field">
          <label>Outcome</label>
          <CustomSelect
            value={side}
            options={yesNoOptions}
            onChange={(v) => setSide(v as TradeSide)}
            disabled={isResolved}
            accentColor={sideColor}
          />
        </div>

        {/* BALANCE STRIP */}
        <div className="balance-strip">
          <span className="label">Your Balance</span>
          <div className="balances">
            <span className="yes">
              {userShareYes > 0 ? userShareYes.toFixed(4) : "0"}
              <span className="unit">YES</span>
            </span>
            <span className="no">
              {userShareNo > 0 ? userShareNo.toFixed(4) : "0"}
              <span className="unit">NO</span>
            </span>
          </div>
        </div>

        {/* ORDER TYPE */}
        <div className="trade-field">
          <label>Order Type</label>
          <CustomSelect
            value={orderMode}
            options={orderTypeOptions}
            onChange={(v) => setOrderMode(v as "market" | "limit")}
            disabled={isResolved}
          />
        </div>

        {/* AMOUNT */}
        <div className="trade-field">
          <label>
            {orderMode === "limit"
              ? `Shares to place (${side.toUpperCase()})`
              : action === "buy"
              ? "You pay"
              : `Shares to sell (${side.toUpperCase()})`}
            {action === "sell" && userShareBig !== undefined && (
              <span className="avail">· avail {userShareSide.toFixed(4)}</span>
            )}
          </label>
          <div className="input-affix">
            <input
              type="number"
              step={orderMode === "limit" || action === "sell" ? "0.0001" : "0.01"}
              min="0"
              value={collateralInput}
              onChange={(e) => setCollateralInput(e.target.value)}
              placeholder={orderMode === "limit" || action === "sell" ? "0" : "0.00"}
              disabled={isResolved}
              className="input input-mono input-mono-large"
            />
            {action === "sell" && userShareBig !== undefined && userShareBig > 0n && collateral > 0 ? (
              <button
                type="button"
                className="max-link"
                onClick={() => setCollateralInput(String(userShareSide))}
              >
                MAX
              </button>
            ) : (
              <span className="affix">{orderMode === "limit" || action === "sell" ? side.toUpperCase() : "USDC"}</span>
            )}
          </div>
        </div>

        {/* LIMIT PRICE */}
        {orderMode === "limit" && (
          <div className="trade-field">
            <label>Limit Price</label>
            <div className="input-affix">
              <input
                type="number"
                value={limitPriceInput}
                onChange={(e) => setLimitPriceInput(e.target.value)}
                placeholder="0.50"
                disabled={isResolved}
                className="input input-mono input-mono-large"
              />
              <span className="affix">USDC</span>
            </div>
            <div className="quick-pick" role="group" aria-label="Quick price picks">
              {[0.25, 0.4, 0.5].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLimitPriceInput(String(p))}
                  className={Number(limitPriceInput) === p ? "active" : ""}
                >
                  {Math.round(p * 100)}¢
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREVIEW */}
        <div className="trade-preview">
          {orderMode === "limit" ? (
            <>
              <div className="trade-preview-row">
                <span className="k">You place</span>
                <span className={`v ${isYes ? "yes" : "no"}`}>
                  {amountWei > 0n ? `${unitsToNumber(amountWei, collateralDecimals).toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
                </span>
              </div>
              <div className="trade-preview-sep" aria-hidden="true" />
              <div className="trade-preview-row">
                <span className="k">{action === "sell" ? "Receive if filled" : "Locked collateral"}</span>
                <span className="v">
                  {action === "sell"
                    ? (limitSellReceive > 0n ? `${unitsToNumber(limitSellReceive, collateralDecimals).toFixed(4)} USDC` : "— USDC")
                    : (placeOrderCost > 0n ? `${unitsToNumber(placeOrderCost, collateralDecimals).toFixed(4)} USDC` : "— USDC")}
                </span>
              </div>
            </>
          ) : action === "buy" ? (
            <>
              <div className="trade-preview-row">
                <span className="k">You pay</span>
                <span className="v">{collateral > 0 ? `${collateral.toFixed(4)} USDC` : "— USDC"}</span>
              </div>
              <div className="trade-preview-sep" aria-hidden="true" />
              <div className="trade-preview-row">
                <span className="k">You receive</span>
                <span className={`v ${isYes ? "yes" : "no"}`}>
                  {expectedCtf > 0 ? `${expectedCtf.toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="trade-preview-row">
                <span className="k">You sell</span>
                <span className={`v ${isYes ? "yes" : "no"}`}>
                  {amountWei > 0n ? `${unitsToNumber(amountWei, collateralDecimals).toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
                </span>
              </div>
              <div className="trade-preview-sep" aria-hidden="true" />
              <div className="trade-preview-row">
                <span className="k">You receive ≈</span>
                <span className="v">
                  {expectedReceive > 0n ? `${unitsToNumber(expectedReceive, collateralDecimals).toFixed(4)} USDC` : "— USDC"}
                </span>
              </div>
              <div className="trade-preview-row">
                <span className="muted" style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Min receive (10% slippage)</span>
                <span className="v muted">
                  {minReceiveWei > 0n ? `${unitsToNumber(minReceiveWei, collateralDecimals).toFixed(4)} USDC` : "— USDC"}
                </span>
              </div>
            </>
          )}

          {orderMode === "limit" && limitPrice > 0 && action === "buy" && (
            <div className="trade-preview-row">
              <span className="muted" style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Effective price</span>
              <span className="v muted">${effectivePrice.toFixed(4)}</span>
            </div>
          )}

          {orderMode !== "limit" && collateral > 0 && plPreview !== null && (
            <div className={`pl-row ${isYes ? "yes" : "no"}`}>
              <span>{action === "buy" ? "If YES wins" : "Net receive"}</span>
              <span className="v">
                {plPreview >= 0 ? `+${plPreview.toFixed(4)}` : plPreview.toFixed(4)} USDC
              </span>
            </div>
          )}

          {action === "sell" && sellOverflow && (
            <div className="alert alert-no">Insufficient shares — try ≤ {userShareSide.toFixed(4)}</div>
          )}
          {showApprove && collateral > 0 && (
            <div className="alert alert-warn">Approval required before placing order</div>
          )}
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={submitDisabled}
          className={submitClass}
        >
          {isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" /> : null}
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
