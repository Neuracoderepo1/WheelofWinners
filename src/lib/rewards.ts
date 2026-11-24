export type Reward = {
  id: string;
  name: string;
  pointsCost: number;
  availableQuantity: number;
  active: boolean;
};

export type RedemptionDecision =
  | { allowed: true; remainingPoints: number }
  | { allowed: false; reason: "INVALID_POINTS" | "INACTIVE_REWARD" | "OUT_OF_STOCK" | "INSUFFICIENT_POINTS" };

export function evaluateRedemption(
  currentPoints: number,
  reward: Reward,
): RedemptionDecision {
  if (!Number.isSafeInteger(currentPoints) || currentPoints < 0 ||
      !Number.isSafeInteger(reward.pointsCost) || reward.pointsCost <= 0) {
    return { allowed: false, reason: "INVALID_POINTS" };
  }
  if (!reward.active) return { allowed: false, reason: "INACTIVE_REWARD" };
  if (!Number.isSafeInteger(reward.availableQuantity) || reward.availableQuantity <= 0) {
    return { allowed: false, reason: "OUT_OF_STOCK" };
  }
  if (currentPoints < reward.pointsCost) {
    return { allowed: false, reason: "INSUFFICIENT_POINTS" };
  }
  return { allowed: true, remainingPoints: currentPoints - reward.pointsCost };
}
