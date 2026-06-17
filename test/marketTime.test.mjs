import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCountdown,
  getMarketTimingStatus,
} from "../src/utils/marketTime.ts";

test("formatCountdown uses compact day hour minute second labels", () => {
  assert.equal(formatCountdown(10_000, 1_000), "2h 30m");
  assert.equal(formatCountdown(1_090, 1_000), "1m 30s");
  assert.equal(formatCountdown(1_030, 1_000), "30s");
});

test("market timing reports active countdown before end time", () => {
  const timing = getMarketTimingStatus(500, 2_000, false, 1_000);

  assert.equal(timing.kind, "active");
  assert.equal(timing.statusLabel, "Active");
  assert.equal(timing.settlementLabel, "Not settled");
  assert.equal(timing.countdownLabel, "Ends in 16m 40s");
});

test("market timing reports ended but not settled after end time", () => {
  const timing = getMarketTimingStatus(500, 900, false, 1_000);

  assert.equal(timing.kind, "awaiting");
  assert.equal(timing.statusLabel, "Awaiting settlement");
  assert.equal(timing.settlementLabel, "Not settled");
  assert.equal(timing.countdownLabel, "Ended, awaiting settlement");
});

test("market timing reports resolved from market info", () => {
  const timing = getMarketTimingStatus(500, 900, true, 1_000);

  assert.equal(timing.kind, "resolved");
  assert.equal(timing.statusLabel, "Resolved");
  assert.equal(timing.settlementLabel, "Settlement resolved");
  assert.equal(timing.countdownLabel, "Market settled");
});
