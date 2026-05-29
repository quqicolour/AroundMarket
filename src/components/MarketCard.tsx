import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatAddress } from "../utils/format";

interface MarketData {
  collateral: string;
  conditionTokens: string;
  orderBook: string;
  matchingEngine: string;
  conditionId: string;
  resolved: boolean;
  fee: bigint;
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

  if (isLoading) return <MarketCardSkeleton />;
  if (error || !valid) return null;

  const orderBookAddr = marketData!.orderBook;
  const resolved = marketData!.resolved;

  const { data: bestBid } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestBid",
    args: [BigInt(marketId)],
    query: { enabled: !!orderBookAddr, retry: false },
  });

  const { data: bestAsk } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: "getBestAsk",
    args: [BigInt(marketId)],
    query: { enabled: !!orderBookAddr, retry: false },
  });

  const yesPct = bestBid ? Math.min(Number(bestBid) / 100, 100) : null;
  const noPct = bestAsk ? Math.min(100 - Number(bestAsk) / 100, 100) : null;

  return (
    <Link to={`/market/${marketId}`} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{
          padding: 22,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 14,
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
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: resolved
                  ? "var(--text-tertiary)"
                  : "var(--primary)",
                boxShadow: resolved ? "none" : "0 0 6px rgba(26,127,90,0.4)",
              }}
            />
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
              padding: "3px 10px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 500,
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
              fontSize: 17,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            Market #{marketId}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 3,
            }}
          >
            YES / NO Binary Market
          </p>
        </div>

        {/* Price bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Order book depth
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 36,
          fontSize: 11,
          fontWeight: 700,
          textAlign: "center",
          color: color === "yes" ? "var(--yes)" : "var(--no)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 7,
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--bg-elevated)",
          position: "relative",
        }}
      >
        {pct !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              borderRadius: 6,
              transition: "width 600ms ease",
              width: `${pct}%`,
              background:
                color === "yes"
                  ? "linear-gradient(to right, rgba(26,127,90,0.3), rgba(26,127,90,0.65))"
                  : "linear-gradient(to left, rgba(201,98,111,0.3), rgba(201,98,111,0.65))",
              ...(color === "yes" ? { left: 0 } : { right: 0 }),
            }}
          />
        )}
      </div>
      <span
        style={{
          width: 36,
          fontSize: 12,
          fontWeight: 700,
          textAlign: "right",
          fontFamily: "'JetBrains Mono', monospace",
          color: color === "yes" ? "var(--yes)" : "var(--no)",
        }}
      >
        {pct !== null ? `${pct.toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
    >
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

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
