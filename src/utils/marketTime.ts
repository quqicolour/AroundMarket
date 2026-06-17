import { useEffect, useState } from "react";

export type MarketStatusKind = "resolved" | "awaiting" | "active" | "scheduled" | "unknown";

export interface MarketTimingStatus {
  kind: MarketStatusKind;
  statusLabel: string;
  settlementLabel: string;
  countdownLabel: string;
}

function plural(value: number, unit: string): string {
  return `${value}${unit}`;
}

export function formatCountdown(targetTime: number, nowTime: number): string {
  const remaining = Math.max(0, targetTime - nowTime);
  if (remaining <= 0) return "0s";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (days > 0) return `${plural(days, "d")} ${plural(hours, "h")}`;
  if (hours > 0) return `${plural(hours, "h")} ${plural(minutes, "m")}`;
  if (minutes > 0) return `${plural(minutes, "m")} ${plural(seconds, "s")}`;
  return plural(seconds, "s");
}

export function useUnixNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function getMarketTimingStatus(
  startTime: number,
  endTime: number,
  resolved: boolean,
  nowTime: number,
): MarketTimingStatus {
  if (resolved) {
    return {
      kind: "resolved",
      statusLabel: "Resolved",
      settlementLabel: "Settlement resolved",
      countdownLabel: "Market settled",
    };
  }

  if (endTime <= 0) {
    return {
      kind: "unknown",
      statusLabel: "Pending",
      settlementLabel: "Not settled",
      countdownLabel: "Schedule pending",
    };
  }

  if (startTime > 0 && nowTime < startTime) {
    return {
      kind: "scheduled",
      statusLabel: "Scheduled",
      settlementLabel: "Not settled",
      countdownLabel: `Starts in ${formatCountdown(startTime, nowTime)}`,
    };
  }

  if (nowTime < endTime) {
    return {
      kind: "active",
      statusLabel: "Active",
      settlementLabel: "Not settled",
      countdownLabel: `Ends in ${formatCountdown(endTime, nowTime)}`,
    };
  }

  return {
    kind: "awaiting",
    statusLabel: "Awaiting settlement",
    settlementLabel: "Not settled",
    countdownLabel: "Ended, awaiting settlement",
  };
}
