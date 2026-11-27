import { describe, expect, it } from "vitest";
import { evaluateRedemption, type Reward } from "./rewards";

const reward: Reward = {
  id: "reward-1",
  name: "Sample voucher",
  pointsCost: 100,
  availableQuantity: 2,
  active: true,
};

describe("evaluateRedemption", () => {
  it("allows a valid redemption and calculates the remaining points", () => {
    expect(evaluateRedemption(250, reward)).toEqual({
      allowed: true,
      remainingPoints: 150,
    });
  });

  it("rejects insufficient points", () => {
    expect(evaluateRedemption(99, reward)).toEqual({
      allowed: false,
      reason: "INSUFFICIENT_POINTS",
    });
  });

  it("rejects inactive rewards", () => {
    expect(evaluateRedemption(250, { ...reward, active: false })).toEqual({
      allowed: false,
      reason: "INACTIVE_REWARD",
    });
  });

  it("rejects unavailable inventory", () => {
    expect(evaluateRedemption(250, { ...reward, availableQuantity: 0 })).toEqual({
      allowed: false,
      reason: "OUT_OF_STOCK",
    });
  });

  it("rejects invalid point balances and costs", () => {
    expect(evaluateRedemption(-1, reward).allowed).toBe(false);
    expect(evaluateRedemption(250, { ...reward, pointsCost: 0 }).allowed).toBe(false);
  });
});
