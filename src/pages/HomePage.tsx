import { useSubgraphMarkets } from "../utils/subgraph";

const steps = ["Create", "Trade YES / NO", "Redeem Winners"];
const signals = ["Orderbook matching", "Onchain positions", "Verifiable settlement"];

export default function HomePage() {
  const { data: markets = [] } = useSubgraphMarkets();
  const count = markets.length;

  return (
    <div className="home-page home-minimal-page">
      <section className="home-minimal-hero">
        <div className="home-minimal-copy">
          <span className="home-eyebrow">Prediction Market</span>
          <h1>AroundMarket</h1>
          <p>Trade probabilities. Settle outcomes onchain.</p>
        </div>
        <div className="home-live-panel">
          <span>Live</span>
          <strong>{count}</strong>
        </div>
      </section>

      <section className="home-step-grid" aria-label="Prediction market flow">
        {steps.map((step, index) => (
          <article key={step} className="home-step-card">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </article>
        ))}
      </section>

      <section className="home-signal-band" aria-label="Market mechanics">
        {signals.map((signal) => (
          <div key={signal}>
            <span />
            {signal}
          </div>
        ))}
      </section>
    </div>
  );
}
