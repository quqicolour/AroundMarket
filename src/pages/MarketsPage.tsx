import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import MarketCard from "../components/MarketCard";
import EmptyState from "../components/EmptyState";
import { useSubgraphMarkets } from "../utils/subgraph";

export default function MarketsPage() {
  const { data: markets = [], isLoading, isError, refetch } = useSubgraphMarkets();

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div className="markets-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Markets</h1>
          <span className="chip chip-neutral">
            {markets.length} {markets.length === 1 ? "market" : "markets"}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="btn btn-soft btn-sm"
          style={{ opacity: isLoading ? 0.5 : 1 }}
        >
          <RefreshCw size={14} strokeWidth={2.2} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="markets-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="market-card" style={{ opacity: 0.85 }}>
              <div className="market-card-head">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <div className="skeleton" style={{ width: 8, height: 8, borderRadius: 999 }} />
                  <div className="skeleton" style={{ width: 36, height: 10 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 999 }} />
              </div>
              <div className="skeleton" style={{ width: "75%", height: 18, marginTop: 4 }} />
              <div className="skeleton" style={{ width: "55%", height: 12 }} />
              <div className="skeleton" style={{ width: "100%", height: 60, borderRadius: 8 }} />
              <div className="market-card-foot">
                <div className="skeleton" style={{ width: 90, height: 28, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: 50, height: 14 }} />
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
