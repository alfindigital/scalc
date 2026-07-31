import { describe, it, expect } from "vitest";
import {
  validateBid,
  validateLot,
  validateTargetTicks,
  validateTargetProfit,
  validateFee,
  validateBalance,
  validateExistingAvg,
  validateExistingLot,
  hasError,
} from "./validation";

describe("validation", () => {
  it("bid: error <=0, non-integer, > IDX cap; warn <50", () => {
    expect(validateBid(NaN).error).toBeTruthy();
    expect(validateBid(0).error).toBeTruthy();
    expect(validateBid(-1).error).toBeTruthy();
    expect(validateBid(1.5).error).toBeTruthy();
    expect(validateBid(60000).error).toBeTruthy();
    expect(validateBid(25).warning).toBeTruthy();
    expect(validateBid(1000)).toEqual({});
  });
  it("lot: integer ≥ 1, non-integer is error", () => {
    expect(validateLot(NaN).error).toBeTruthy();
    expect(validateLot(0).error).toBeTruthy();
    expect(validateLot(1.5).error).toBeTruthy();
    expect(validateLot(2_000_000).warning).toBeTruthy();
    expect(validateLot(100)).toEqual({});
  });
  it("targetTicks: 1–20, warn >10", () => {
    expect(validateTargetTicks(0).error).toBeTruthy();
    expect(validateTargetTicks(25).error).toBeTruthy();
    expect(validateTargetTicks(12).warning).toBeTruthy();
    expect(validateTargetTicks(3)).toEqual({});
  });
  it("targetProfit", () => {
    expect(validateTargetProfit(-1).error).toBeTruthy();
    expect(validateTargetProfit(60).error).toBeTruthy();
    expect(validateTargetProfit(8).warning).toBeTruthy();
  });
  it("fee", () => {
    expect(validateFee(-1, "buy").error).toBeTruthy();
    expect(validateFee(2, "buy").error).toBeTruthy();
    expect(validateFee(0.7, "sell").warning).toBeTruthy();
    expect(validateFee(0.15, "buy")).toEqual({});
  });
  it("balance ≥ 0", () => {
    expect(validateBalance(-1).error).toBeTruthy();
    expect(validateBalance(0)).toEqual({});
  });
  it("existing fields only enforced in position mode", () => {
    expect(validateExistingAvg(0, "entry")).toEqual({});
    expect(validateExistingAvg(0, "position").error).toBeTruthy();
    expect(validateExistingLot(0, "entry")).toEqual({});
    expect(validateExistingLot(0, "position").error).toBeTruthy();
  });
  it("hasError aggregator", () => {
    expect(hasError({}, { warning: "x" })).toBe(false);
    expect(hasError({ error: "x" }, {})).toBe(true);
  });
});
