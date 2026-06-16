import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatAddress } from "../utils/format";
import { formatProbabilityPercent, priceWeiToPercent } from "../utils/tradingMath";

interface MarketData {
  creator: string;
  market: string;
  collateral: string;
  conditionTokens: string;
  orderBook: string;
  matchingEngine: string;
  conditionId: string;
  startTime: bigint;
  endTime: bigint;
  resolved: boolean;
  fee: bigint;
  question?: string;
  dataSource?: string;
}

function isMarketValid(data: MarketData | undefined | null): boolean {
  if (!data) return false;
  return data.orderBook !== "0x0000000000000000000000000000000000000000";
}

export default function MarketCard({ marketId }: { marketId: number }) {
  const [expanded, setExpanded] = useState(false);

  const {
    data: rawMarketData,
    isLoading,
    error,
  } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(marketId)],
    query: { retry: false },
  });

  const marketData = rawMarketData as MarketData | undefined;
  const valid = isMarketValid(marketData);
  const orderBookAddr = valid ? marketData!.orderBook : undefined;
  const resolved = valid ? marketData!.resolved : false;
  const question = marketData?.question?.trim() || `Market #${marketId}`;
  const dataSource = marketData?.dataSource?.trim() || "Data source not provided";
  const startTime = marketData?.startTime ? Number(marketData.startTime) : 0;
  const endTime = marketData?.endTime ? Number(marketData.endTime) : 0;

  const { data: bestBid } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestBid",
    args: [BigInt(marketId)],
    query: { enabled: valid && !!orderBookAddr, retry: false },
  });

  const { data: bestAsk } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestAsk",
    args: [BigInt(marketId)],
    query: { enabled: valid && !!orderBookAddr, retry: false },
  });

  const yesPct = bestBid ? priceWeiToPercent(bestBid as bigint) : null;
  const noPct = bestAsk ? priceWeiToPercent(bestAsk as bigint) : null;

  if (isLoading) return <MarketCardSkeleton />;
  if (error || !valid) return null;

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
            <div style={resolved ? statusDotMuted : statusDotLive} />
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
              background: resolved
                ? "var(--bg-elevated)"
                : "var(--primary-light)",
              color: resolved ? "var(--text-tertiary)" : "var(--primary-text)",
              border: `1px solid ${resolved ? "var(--border)" : "var(--yes-border)"}`,
            }}
          >
            {resolved ? "Resolved" : "Active"}
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
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {endTime > 0
              ? `Ends ${new Date(endTime * 1000).toLocaleDateString()}`
              : "Order book depth"}
          </span>
          <span
            style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}
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
              value={formatAddress(marketData!.collateral, 6)}
            />
            <DetailRow
              label="Start"
              value={startTime > 0 ? new Date(startTime * 1000).toLocaleString() : "Pending"}
              mono={false}
            />
            <DetailRow
              label="End"
              value={endTime > 0 ? new Date(endTime * 1000).toLocaleString() : "Pending"}
              mono={false}
            />
            <DetailRow
              label="Order Book"
              value={formatAddress(marketData!.orderBook, 6)}
            />
            <DetailRow
              label="Condition ID"
              value={formatAddress(marketData!.conditionId ?? "", 8)}
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

function MarketCardSkeleton() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--bg-elevated)",
          }}
        />
        <div
          style={{
            width: 36,
            height: 10,
            borderRadius: 4,
            background: "var(--bg-elevated)",
          }}
        />
      </div>
      <div
        style={{
          width: "60%",
          height: 16,
          borderRadius: 6,
          background: "var(--bg-elevated)",
          marginBottom: 16,
        }}
      />
      <div
        style={{
          height: 44,
          borderRadius: 10,
          background: "var(--bg-elevated)",
          marginBottom: 14,
        }}
      />
      <div
        style={{
          display: "flex",
          gap: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 10,
            borderRadius: 4,
            background: "var(--bg-elevated)",
          }}
        />
        <div
          style={{
            width: 40,
            height: 10,
            borderRadius: 4,
            background: "var(--bg-elevated)",
          }}
        />
      </div>
    </div>
  );
}

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
