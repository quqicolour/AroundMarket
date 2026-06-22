import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { formatAddress } from "../utils/format";
import { getMarketTimingStatus, useUnixNow } from "../utils/marketTime";
import { bestAsk, bestBid, SubgraphMarket, useSubgraphMarketOrders } from "../utils/subgraph";
import { formatProbabilityPercent, priceWeiToPercent } from "../utils/tradingMath";

export default function MarketCard({ market }: { market: SubgraphMarket }) {
  const [expanded, setExpanded] = useState(false);

  const marketId = Number(market.marketId);
  const question = market.question?.trim() || `Market #${marketId}`;
  const dataSource = market.dataSource?.trim() || "Data source not provided";
  const startTime = Number(market.startTime || 0);
  const endTime = Number(market.endTime || 0);
  const nowTime = useUnixNow();
  const timing = getMarketTimingStatus(startTime, endTime, market.resolved, nowTime);

  const { data: orders = [] } = useSubgraphMarketOrders(marketId);
  const yesBestBid = bestBid(orders);
  const noBestAsk = bestAsk(orders);

  const yesPct = yesBestBid ? priceWeiToPercent(yesBestBid) : null;
  const noPct = noBestAsk ? priceWeiToPercent(noBestAsk) : null;

  return (
    <Link to={`/market/${marketId}`} className="market-card" aria-label={question}>
      <div className="market-card-head">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className={`status-dot ${timing.kind === "active" ? "live" : ""}`} aria-hidden="true" />
          <span className="market-card-id">#{marketId}</span>
        </div>
        <span className={`chip ${timing.kind === "active" ? "chip-yes" : timing.kind === "awaiting" ? "chip-warning" : "chip-neutral"}`}>
          {timing.statusLabel}
        </span>
      </div>

      <div>
        <h3 className="market-card-title">{question}</h3>
        <p className="market-card-desc">{dataSource}</p>
      </div>

      <div className="prob-panel">
        <PriceBar label="YES" pct={yesPct} />
        <PriceBar label="NO" pct={noPct} />
      </div>

      <div className="market-card-foot">
        <div className="market-card-time">
          <span className="market-card-time-label">Market Time</span>
          <span className={`market-card-time-value ${timing.kind === "active" ? "active" : timing.kind === "awaiting" ? "awaiting" : ""}`}>
            {timing.countdownLabel}
          </span>
        </div>
        <span className="market-card-cta">
          Trade <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
          <DetailRow label="Collateral" value={formatAddress(market.collateral, 6)} />
          <DetailRow label="Start" value={startTime > 0 ? new Date(startTime * 1000).toLocaleString() : "Pending"} mono={false} />
          <DetailRow label="Countdown" value={timing.countdownLabel} mono={false} />
          <DetailRow label="Settlement" value={timing.settlementLabel} mono={false} />
          <DetailRow label="Order Book" value={formatAddress(market.orderBook, 6)} />
          <DetailRow label="Condition ID" value={formatAddress(market.conditionId ?? "", 8)} />
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setExpanded((v) => !v);
        }}
        className="market-card-expand"
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Show details"}
        <ChevronDown size={14} strokeWidth={2.2} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }} aria-hidden="true" />
      </button>
    </Link>
  );
}

function PriceBar({ label, pct }: { label: "YES" | "NO"; pct: number | null }) {
  const normalizedPct = pct === null ? null : Math.min(100, Math.max(0, pct));
  const tone = label === "YES" ? "yes" : "no";

  return (
    <div className="prob-row">
      <span className={`prob-label ${tone}`}>{label}</span>
      <div className="prob-track">
        {normalizedPct !== null && (
          <div className={`prob-fill ${tone}`} style={{ width: `${normalizedPct}%` }} />
        )}
      </div>
      <span className={`prob-value ${tone}`}>
        {normalizedPct !== null ? formatProbabilityPercent(normalizedPct) : "—"}
      </span>
    </div>
  );
}

function DetailRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11 }}>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
          color: "var(--text-secondary)",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
