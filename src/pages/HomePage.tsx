import { ArrowRight, Sparkles, Layers, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubgraphMarkets } from "../utils/subgraph";

const steps = [
  { num: "01", title: "Create", desc: "Launch a YES / NO market on any future event.", Icon: Sparkles },
  { num: "02", title: "Trade", desc: "Buy and sell outcomes in real time at live prices.", Icon: Layers },
  { num: "03", title: "Redeem", desc: "Winning shares settle to USDC through the oracle.", Icon: Trophy },
];

const signals = ["Orderbook matching", "Onchain positions", "Verifiable settlement"];

export default function HomePage() {
  const { data: markets = [] } = useSubgraphMarkets();
  const count = markets.length;

  return (
    <div className="page-container home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">Prediction Market</span>
          <h1>AroundMarket</h1>
          <p>Trade probabilities. Settle outcomes onchain.</p>
          <div style={{ marginTop: 28, display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/markets" className="btn btn-primary btn-lg">
              Browse Markets
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link to="/create" className="btn btn-soft btn-lg">
              Create Market
            </Link>
          </div>
        </div>
        <div className="home-hero-panel">
          <span className="label">Live</span>
          <span className="value">{count}</span>
        </div>
      </section>

      <section className="home-step-grid" aria-label="Prediction market flow">
        {steps.map(({ num, title, desc, Icon }) => (
          <article key={title} className="home-step-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="num">{num}</span>
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" style={{ color: "var(--primary)" }} />
            </div>
            <strong className="title">{title}</strong>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.45 }}>{desc}</p>
          </article>
        ))}
      </section>

      <section className="home-signal-band" aria-label="Market mechanics">
        {signals.map((signal) => (
          <div key={signal}>
            <span className="dot" aria-hidden="true" />
            {signal}
          </div>
        ))}
      </section>
    </div>
  );
}
