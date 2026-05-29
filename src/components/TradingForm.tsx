import { useState, useEffect, useRef } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { ABIs } from "../abis";
import { parseAmount } from "../utils/format";
import { Loader2 } from "lucide-react";
import { useTxToast } from "./TxToastContext";
import { CONTRACTS } from "../config/contracts";
import { erc20Abi } from "viem";

// ── ERC20 ABI (inline, no extra file needed) ──────────────────────────────────
const ERC20_ABI = erc20Abi;

interface Props {
  // MarketData tuple: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
  marketData: readonly [string, string, string, string, string, string, string, bigint, bigint, boolean, number];
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
export default function TradingForm({ marketData, initialSide = "yes" }: Props) {
  const { showPending, showSuccess, showError } = useTxToast();
  const { isConnected, address: user } = useAccount();

  const [action, setAction] = useState<TradeAction>("buy");
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [orderMode, setOrderMode] = useState<"market" | "limit">("market");
  const [collateralInput, setCollateralInput] = useState("");
  const [limitPriceInput, setLimitPriceInput] = useState("");

  // MarketData tuple: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
  const marketAddr = marketData[1] as string;
  const isResolved = marketData[9] as boolean;

  const collateral = parseFloat(collateralInput) || 0;
  const limitPrice = parseFloat(limitPriceInput) || 0;
  const priceForCalc = orderMode === "market" ? MOCK_PRICE_YES : (limitPrice > 0 ? limitPrice : MOCK_PRICE_YES);

  const ctfTokens = collateral > 0 && priceForCalc > 0
    ? (action === "buy" ? collateral / priceForCalc : collateral / (1 - priceForCalc))
    : 0;

  const isYes = side === "yes";
  const sideColor = isYes ? "var(--yes)" : "var(--no)";
  const sideBg = sideColor;

  // Cost in collateral token decimals (6 for USDC)
  const costRaw = action === "buy"
    ? priceForCalc * collateral          // cost = price * amount (ctfTokens)
    : collateral;                         // sell: receive collateral directly
  const costAmt = costRaw > 0 ? parseAmount(String(Math.round(costRaw * 1e6))) : 0n;

  // ── Approval check ──────────────────────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.Collateral as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: { enabled: isConnected && !!user && !!marketAddr && costAmt > 0 },
  });

  const needsApproval = isConnected && !!allowance && costAmt > 0 && allowance < costAmt;

  // ── Approval mutation ───────────────────────────────────────────────────────
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  useEffect(() => {
    if (!approveTxHash) return;
    if (isApproving) showPending(approveTxHash, "Approve USDC");
  }, [approveTxHash, isApproving]);

  useEffect(() => {
    if (!approveTxHash || !approveSuccess) return;
    showSuccess("Approved", approveTxHash);
    refetchAllowance();
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
  }, [orderTxHash, orderSuccess]);

  useEffect(() => {
    if (!orderTxHash || !orderError) return;
    showError("Order failed");
  }, [orderTxHash, orderError]);

  const handleApprove = () => {
    writeApprove({
      address: CONTRACTS.Collateral as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [marketAddr as `0x${string}`, costAmt],
    });
  };

  // isYes = side === "yes" (determines which outcome position is bought/sold)
  // For Market order (taker): use fillOrder
  // For Limit order (maker): use placeOrder

  const handleOrder = () => {
    const price = orderMode === "market" ? MOCK_PRICE_YES : limitPrice;
    const amount = BigInt(Math.round(ctfTokens * 1e6));
    const minFill = 1n;
    try {
      if (orderMode === "market") {
        // Taker: fillOrder(isYes, limitPrice, amount, minFill)
        writeOrder({
          abi: ABIs.Market,
          address: marketAddr as `0x${string}`,
          functionName: "fillOrder",
          args: [isYes, BigInt(Math.round(price * 1e18)), amount, minFill],
        });
      } else {
        // Maker: placeOrder(isYes, price, amount)
        writeOrder({
          abi: ABIs.Market,
          address: marketAddr as `0x${string}`,
          functionName: "placeOrder",
          args: [isYes, BigInt(Math.round(price * 1e18)), amount],
        });
      }
    } catch (err) {
      const msg = (err as any)?.shortMessage || (err as any)?.message || "Order failed";
      showError(msg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || isResolved) return;

    if (costAmt <= 0) return;

    if (needsApproval) {
      handleApprove();
    } else {
      handleOrder();
    }
  };

  // Determine button state
  const isPending = isApprovePending || isApproving || isOrderPending || isOrdering;
  const needsApprove = isConnected && costAmt > 0 && (!allowance || allowance < costAmt);

  const submitDisabled = !isConnected || collateral <= 0 || (orderMode === "limit" && limitPrice <= 0) || isPending || isResolved;

  let buttonLabel = "";
  if (isPending) {
    buttonLabel = isApproving ? "Approving..." : isOrdering ? "Confirming..." : needsApprove ? "Approve & Order" : "Confirming...";
  } else if (isResolved) {
    buttonLabel = "Market Resolved";
  } else if (!isConnected) {
    buttonLabel = "Connect Wallet";
  } else if (needsApprove) {
    buttonLabel = `Approve USDC`;
  } else {
    buttonLabel = `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`;
  }

  const errMsg = "";
  const yesRatio = Math.round(MOCK_PRICE_YES * 100);
  const noRatio = 100 - yesRatio;
  const effectivePrice = action === "buy" ? priceForCalc : (1 - priceForCalc);

  const plPreview = (() => {
    if (collateral <= 0) return null;
    if (action === "buy") {
      return isYes ? collateral / priceForCalc : 0;
    } else {
      const received = collateral;
      const payoutIfYes = isYes ? ctfTokens * 1 : 0;
      return received - payoutIfYes;
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

        {/* Header: BIG ratio */}
        <div style={{
          padding: "14px 18px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--yes)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
                {yesRatio}%
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Yes</div>
            </div>
            <div style={{ width: 1, height: 28, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--no)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
                {noRatio}%
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>No</div>
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

          {/* Collateral */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
              {action === "buy" ? "You pay (USDC)" : "You receive (USDC)"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number" step="0.01" min="0"
                value={collateralInput}
                onChange={e => setCollateralInput(e.target.value)}
                placeholder="0.00"
                disabled={isResolved}
                className="input"
                style={{ fontSize: 16, fontWeight: 600, padding: "10px 52px 10px 14px", textAlign: "right" }}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>USDC</span>
            </div>
          </div>

          {/* Limit price */}
          {orderMode === "limit" && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
                Limit Price <span style={{ color: "var(--text-tertiary)" }}>(0 – 1)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number" step="0.01" min="0" max="1"
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
                {[0.25, 0.5, 0.75].map(p => (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {action === "buy" ? "You pay" : "You receive"}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                {collateral > 0 ? `${collateral.toFixed(4)} USDC` : "— USDC"}
              </span>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {action === "buy" ? "You receive" : "You pay"}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: sideColor }}>
                {ctfTokens > 0 ? `${ctfTokens.toFixed(4)} ${side.toUpperCase()}` : `— ${side.toUpperCase()}`}
              </span>
            </div>
            {orderMode === "limit" && limitPrice > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Effective price</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 12, color: "var(--text-tertiary)" }}>
                  ${effectivePrice.toFixed(4)}
                </span>
              </div>
            )}
            {collateral > 0 && plPreview !== null && (
              <div style={{
                background: isYes ? "var(--yes-light)" : "var(--no-light)",
                borderRadius: 8, padding: "6px 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: sideColor }}>
                  {action === "buy" ? "If YES wins" : "Net (YES resolves YES)"}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: sideColor }}>
                  {plPreview >= 0 ? `+${plPreview.toFixed(4)}` : `${plPreview.toFixed(4)}`} USDC
                </span>
              </div>
            )}
            {needsApprove && collateral > 0 && (
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