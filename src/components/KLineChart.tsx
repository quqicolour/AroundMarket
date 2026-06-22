import { useMemo, useRef, useState } from "react";
import {
  CandleInterval,
  SubgraphMarketCandle,
  useSubgraphMarketCandles,
} from "../utils/subgraph";

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

interface Props {
  marketId: number;
  isYes?: boolean;
  width?: number;
  height?: number;
}

type ChartSide = "yes" | "no";

const TIMEFRAMES = [
  { label: "1m", interval: "ONE_MINUTE" },
  { label: "15m", interval: "FIFTEEN_MINUTES" },
  { label: "30m", interval: "THIRTY_MINUTES" },
  { label: "1H", interval: "ONE_HOUR" },
  { label: "4H", interval: "FOUR_HOURS" },
  { label: "12H", interval: "TWELVE_HOURS" },
  { label: "1D", interval: "ONE_DAY" },
] as const;

type TF = (typeof TIMEFRAMES)[number]["label"];

const intervalByLabel = TIMEFRAMES.reduce<Record<TF, CandleInterval>>((acc, item) => {
  acc[item.label] = item.interval;
  return acc;
}, {} as Record<TF, CandleInterval>);

function weiPriceToProbability(value: string): number {
  return Number(value) / 1e18;
}

function bigIntStringToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCandle(candle: SubgraphMarketCandle): Candle {
  return {
    ts: Number(candle.periodStart) * 1000,
    open: weiPriceToProbability(candle.open),
    high: weiPriceToProbability(candle.high),
    low: weiPriceToProbability(candle.low),
    close: weiPriceToProbability(candle.close),
    volume: bigIntStringToNumber(candle.volume),
    tradeCount: bigIntStringToNumber(candle.tradeCount),
  };
}

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function formatPercent(price: number): string {
  return `${(price * 100).toFixed(2)}%`;
}

function formatAxisTime(ts: number, tf: TF): string {
  const d = new Date(ts);
  if (tf === "1m" || tf === "15m" || tf === "30m" || tf === "1H") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (tf === "4H" || tf === "12H") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export default function KLineChart({
  marketId,
  isYes = true,
  width = 760,
  height = 380,
}: Props) {
  const [tf, setTf] = useState<TF>("1H");
  const [side, setSide] = useState<ChartSide>(isYes ? "yes" : "no");
  const [tooltip, setTooltip] = useState<Candle | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interval = intervalByLabel[tf];
  const chartIsYes = side === "yes";

  const { data: rawCandles = [], isLoading, isError } = useSubgraphMarketCandles(
    marketId,
    interval,
    chartIsYes,
  );

  const candles = useMemo(
    () => rawCandles.map(toCandle).filter((c) => c.high > 0 && c.low > 0),
    [rawCandles],
  );

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const changePct =
    lastCandle && prevCandle && prevCandle.close > 0
      ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
      : 0;
  const isUp = changePct >= 0;
  const sideLabel = chartIsYes ? "YES" : "NO";
  const latestPrice = lastCandle ? formatPrice(lastCandle.close) : "-";
  const latestPercent = lastCandle ? formatPercent(lastCandle.close) : "-";

  if (isLoading) {
    return (
      <ChartShell
        tf={tf}
        setTf={setTf}
        side={side}
        setSide={setSide}
        sideLabel={sideLabel}
        priceLabel="Loading"
        percentLabel="-"
        changeLabel=""
        isUp
      >
        <div className="chart-loading" style={{ minHeight: height }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </ChartShell>
    );
  }

  if (isError || candles.length === 0) {
    return (
      <ChartShell
        tf={tf}
        setTf={setTf}
        side={side}
        setSide={setSide}
        sideLabel={sideLabel}
        priceLabel="-"
        percentLabel="-"
        changeLabel=""
        isUp
      >
        <div className="chart-empty" style={{ minHeight: height }}>
          <strong>{isError ? "Chart unavailable" : "No price history yet"}</strong>
          <span>
            {isError
              ? "The subgraph is still indexing or returned an error."
              : "Candles will appear after matched trades are indexed."}
          </span>
        </div>
      </ChartShell>
    );
  }

  const rawMin = Math.min(...candles.map((c) => c.low));
  const rawMax = Math.max(...candles.map((c) => c.high));
  const padding = Math.max((rawMax - rawMin) * 0.18, 0.01);
  const priceMin = clamp01(rawMin - padding);
  const priceMax = clamp01(rawMax + padding);
  const priceRange = priceMax - priceMin || 0.02;
  const volMax = Math.max(...candles.map((c) => c.volume || c.tradeCount || 1));

  const chartH = Math.floor(height * 0.76);
  const volH = Math.floor(height * 0.16);
  const gap = Math.floor(height * 0.04);
  const padTop = 18;
  const padBottom = 24;
  const padLeft = 18;
  const padRight = 58;

  const plotW = width - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const step = plotW / Math.max(candles.length, 1);
  const volumeBarW = Math.max(2, Math.min(10, step * 0.56));

  function pxY(price: number): number {
    return chartH - padBottom - ((price - priceMin) / priceRange) * plotH;
  }
  function pxX(i: number): number {
    return padLeft + step * i + step / 2;
  }
  function pxVol(v: number): number {
    return chartH + gap + volH - (v / (volMax || 1)) * volH;
  }
  function snapToCandle(mouseX: number): number {
    return Math.floor((mouseX - padLeft) / step);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = snapToCandle(mouseX);
    const clamped = Math.max(0, Math.min(candles.length - 1, idx));
    setSelectedIdx(clamped);
    setTooltip(candles[clamped]);
  }
  function handleMouseLeave() {
    setSelectedIdx(null);
    setTooltip(null);
  }

  const gridPrices = Array.from({ length: 5 }, (_, i) => priceMin + (priceRange * i) / 4);
  const timeGridIndices = Array.from(new Set([
    0,
    Math.floor(candles.length * 0.25),
    Math.floor(candles.length * 0.5),
    Math.floor(candles.length * 0.75),
    candles.length - 1,
  ])).filter((i) => candles[i]);

  const volBars = candles.map((c, i) => {
    const isGreen = c.close >= c.open;
    const volume = c.volume || c.tradeCount;
    const barH = Math.max(2, (volume / (volMax || 1)) * volH);
    return { x: pxX(i) - volumeBarW / 2, y: pxVol(volume), w: volumeBarW, h: barH, isGreen };
  });

  const linePoints = candles.map((c, i) => ({ x: pxX(i), y: pxY(c.close), candle: c }));
  const linePath = linePoints
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = linePoints.length
    ? `${linePath} L ${linePoints[linePoints.length - 1].x.toFixed(2)} ${chartH - padBottom} L ${linePoints[0].x.toFixed(2)} ${chartH - padBottom} Z`
    : "";
  const lineTone = lastCandle && candles[0] && lastCandle.close >= candles[0].close ? "up" : "down";

  return (
    <ChartShell
      tf={tf}
      setTf={setTf}
      side={side}
      setSide={setSide}
      sideLabel={sideLabel}
      priceLabel={latestPrice}
      percentLabel={latestPercent}
      changeLabel={`${isUp ? "+" : ""}${changePct.toFixed(2)}%`}
      isUp={isUp}
    >
      <div className="chart-canvas">
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${sideLabel} price line chart`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <rect x="0" y="0" width={width} height={height} fill="transparent" />

          {timeGridIndices.map((i) => (
            <line
              key={`time-grid-${i}`}
              x1={pxX(i)}
              y1={padTop}
              x2={pxX(i)}
              y2={chartH + gap + volH}
              className="chart-grid vertical"
            />
          ))}

          {gridPrices.map((p, i) => {
            const y = pxY(p);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} className="chart-grid" />
                <text x={width - padRight + 10} y={y + 4} className="chart-axis-label">
                  {formatPrice(p)}
                </text>
              </g>
            );
          })}

          {volBars.map((v, i) => (
            <rect
              key={i}
              x={v.x}
              y={v.y}
              width={v.w}
              height={v.h}
              className={v.isGreen ? "chart-volume-bar up" : "chart-volume-bar down"}
              rx={1}
            />
          ))}

          <path className={`chart-line-area ${lineTone}`} d={areaPath} />
          <path className={`chart-price-line ${lineTone}`} d={linePath} />

          {selectedIdx !== null && tooltip && (
            <>
              <line x1={pxX(selectedIdx)} y1={padTop} x2={pxX(selectedIdx)} y2={chartH - padBottom} className="chart-crosshair" />
              <line x1={padLeft} y1={pxY(tooltip.close)} x2={width - padRight} y2={pxY(tooltip.close)} className="chart-crosshair" />
              <circle
                cx={pxX(selectedIdx)}
                cy={pxY(tooltip.close)}
                r={4}
                className={`chart-line-point ${lineTone}`}
              />
              <rect x={width - padRight + 6} y={pxY(tooltip.close) - 11} width={46} height={20} rx={5} className="chart-price-tag-bg" />
              <text x={width - padRight + 29} y={pxY(tooltip.close) + 4} textAnchor="middle" className="chart-price-tag">
                {formatPrice(tooltip.close)}
              </text>
            </>
          )}

          {[0, Math.floor(candles.length / 2), candles.length - 1].map((i) => (
            candles[i] ? (
              <text key={i} x={pxX(i)} y={height - 7} textAnchor="middle" className="chart-time-label">
                {formatAxisTime(candles[i].ts, tf)}
              </text>
            ) : null
          ))}
        </svg>

        {tooltip && selectedIdx !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `min(${Math.max(8, (pxX(selectedIdx) / width) * 100)}%, calc(100% - 176px))`,
              top: Math.max(pxY(tooltip.high) - 16, 10),
            }}
          >
            <div className="chart-tooltip-time">
              {new Date(tooltip.ts).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <TooltipRow label="Open" value={formatPrice(tooltip.open)} />
            <TooltipRow label="High" value={formatPrice(tooltip.high)} tone="yes" />
            <TooltipRow label="Low" value={formatPrice(tooltip.low)} tone="no" />
            <TooltipRow label="Close" value={formatPrice(tooltip.close)} />
            <TooltipRow label="Trades" value={tooltip.tradeCount.toFixed(0)} />
          </div>
        )}
      </div>
    </ChartShell>
  );
}

function ChartShell({
  children,
  tf,
  setTf,
  side,
  setSide,
  sideLabel,
  priceLabel,
  percentLabel,
  changeLabel,
  isUp,
}: {
  children: React.ReactNode;
  tf: TF;
  setTf: (tf: TF) => void;
  side: ChartSide;
  setSide: (side: ChartSide) => void;
  sideLabel: string;
  priceLabel: string;
  percentLabel: string;
  changeLabel: string;
  isUp: boolean;
}) {
  return (
    <section className="chart-panel">
      <div className="chart-head">
        <div className="chart-price-block">
          <span className={`chart-outcome-chip ${side}`}>{sideLabel}</span>
          <strong className="chart-price-value">{priceLabel}</strong>
          <span className="chart-price-percent">{percentLabel}</span>
          {changeLabel && (
            <span className={`chart-change ${isUp ? "up" : "down"}`}>{changeLabel}</span>
          )}
        </div>

        <div className="chart-controls">
          <div className="chart-tabs" role="tablist" aria-label="Chart outcome">
            <button
              type="button"
              role="tab"
              aria-selected={side === "yes"}
              className={side === "yes" ? "active yes" : ""}
              onClick={() => setSide("yes")}
            >
              YES
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={side === "no"}
              className={side === "no" ? "active no" : ""}
              onClick={() => setSide("no")}
            >
              NO
            </button>
          </div>

          <div className="chart-tabs" role="tablist" aria-label="Chart timeframe">
            {TIMEFRAMES.map((f) => (
              <button
                key={f.label}
                type="button"
                role="tab"
                aria-selected={tf === f.label}
                className={tf === f.label ? "active" : ""}
                onClick={() => setTf(f.label)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

function TooltipRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "yes" | "no";
}) {
  return (
    <div className="chart-tooltip-row">
      <span>{label}</span>
      <strong className={tone === "yes" ? "yes" : tone === "no" ? "no" : ""}>
        {value}
      </strong>
    </div>
  );
}

export type { Candle };
