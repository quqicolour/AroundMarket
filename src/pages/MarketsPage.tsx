import { useCallback } from "react";
import MarketCard from "../components/MarketCard";
import EmptyState from "../components/EmptyState";
import { useSubgraphMarkets } from "../utils/subgraph";

export default function MarketsPage() {
  const { data: markets = [], isLoading, isError, refetch } = useSubgraphMarkets();

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-5">
      <div className="markets-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: 0 }}>Markets</h1>
          <div className="tag-chip">
            {markets.length} {markets.length === 1 ? "market" : "markets"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="market-action-button"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="markets-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, opacity: 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border-strong)" }} />
                <div style={{ width: 36, height: 10, borderRadius: 4, background: "var(--bg-elevated)" }} />
              </div>
              <div style={{ width: "60%", height: 16, borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 16 }} />
              <div style={{ height: 44, borderRadius: 10, background: "var(--bg-elevated)", marginBottom: 14 }} />
              <div style={{ display: "flex", gap: 16, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 40, height: 10, borderRadius: 4, background: "var(--bg-elevated)" }} />
                <div style={{ width: 40, height: 10, borderRadius: 4, background: "var(--bg-elevated)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Unable to Load"
          desc="Check your network connection or verify the subgraph is synced"
        />
      ) : markets.length === 0 ? (
        <EmptyState title="No markets yet" desc="Be the first to create a prediction market" />
      ) : (
        <div className="markets-grid">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
