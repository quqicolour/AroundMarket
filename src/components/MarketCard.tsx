import React, { useState } from "react";
import { Link } from "react-router-dom";
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
    <Link to={`/market/${marketId}`} style={{ textDecoration: "none" }}>
      <div
        className="market-card"
        style={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={timing.kind === "active" ? statusDotLive : statusDotMuted} />
            <span
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-tertiary)",
              }}
            >
              #{marketId}
            </span>
          </div>
          <div
            style={{
              padding: "4px 9px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: timing.kind === "active"
                ? "var(--primary-light)"
                : "var(--bg-elevated)",
              color: timing.kind === "active" ? "var(--primary-text)" : "var(--text-tertiary)",
              border: `1px solid ${timing.kind === "active" ? "var(--yes-border)" : "var(--border)"}`,
            }}
          >
            {timing.statusLabel}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3
            className="font-display"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.22,
              minHeight: 44,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {question}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 7,
              lineHeight: 1.45,
              minHeight: 35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {dataSource}
          </p>
        </div>

        {/* Price bars */}
        <div className="market-probability-panel">
          <PriceBar label="YES" pct={yesPct} color="yes" />
          <PriceBar label="NO" pct={noPct} color="no" />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              minWidth: 0,
              padding: "7px 10px",
              borderRadius: 8,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${timing.kind === "active" ? "var(--primary)" : timing.kind === "awaiting" ? "var(--warning)" : "var(--border-strong)"}`,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0 }}>
              Market Time
            </span>
            <span style={{ fontSize: 12, color: timing.kind === "active" ? "var(--primary-text)" : timing.kind === "awaiting" ? "var(--warning)" : "var(--text-secondary)", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
              {timing.countdownLabel}
            </span>
          </div>
          <span
            style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", whiteSpace: "nowrap" }}
          >
            Trade →
          </span>
        </div>

        {/* Expanded */}
        {expanded && (
          <div
            style={{
              paddingTop: 12,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <DetailRow
              label="Collateral"
              value={formatAddress(market.collateral, 6)}
            />
            <DetailRow
              label="Start"
              value={startTime > 0 ? new Date(startTime * 1000).toLocaleString() : "Pending"}
              mono={false}
            />
            <DetailRow
              label="Countdown"
              value={timing.countdownLabel}
              mono={false}
            />
            <DetailRow
              label="Settlement"
              value={timing.settlementLabel}
              mono={false}
            />
            <DetailRow
              label="Order Book"
              value={formatAddress(market.orderBook, 6)}
            />
            <DetailRow
              label="Condition ID"
              value={formatAddress(market.conditionId ?? "", 8)}
            />
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          style={expandBtn}
        >
          {expanded ? "Collapse ∧" : "Expand ∨"}
        </button>
      </div>
    </Link>
  );
}

function PriceBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number | null;
  color: "yes" | "no";
}) {
  const normalizedPct = pct === null ? null : Math.min(100, Math.max(0, pct));

  return (
    <div className="market-probability-row">
      <span
        className={color === "yes" ? "market-probability-label yes" : "market-probability-label no"}
      >
        {label}
      </span>
      <div
        className="market-probability-track"
      >
        {normalizedPct !== null && (
          <div
            className={color === "yes" ? "market-probability-fill yes" : "market-probability-fill no"}
            style={{
              width: `${normalizedPct}%`,
            }}
          />
        )}
      </div>
      <span
        className={color === "yes" ? "market-probability-value yes" : "market-probability-value no"}
      >
        {normalizedPct !== null ? formatProbabilityPercent(normalizedPct) : "—"}
      </span>
    </div>
  );
}

function DetailRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
    >
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
          color: "var(--text-secondary)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const statusDotLive: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--primary)",
  boxShadow: "0 0 0 4px rgba(26,127,90,0.1)",
};

const statusDotMuted: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--text-tertiary)",
};

const expandBtn: React.CSSProperties = {
  width: "100%",
  paddingTop: 8,
  paddingBottom: 8,
  fontSize: 11,
  color: "var(--text-tertiary)",
  background: "transparent",
  border: "none",
  borderTop: "1px solid var(--border-subtle)",
  cursor: "pointer",
  textAlign: "center",
  marginTop: -4,
  transition: "color 150ms",
  borderRadius: "0 0 12px 12px",
};
