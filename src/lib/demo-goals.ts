export type GoalDirection = "minimum" | "maximum";
export type GoalStatus = "met" | "attention" | "alert" | "unset";

// Preview-only thresholds, never official business targets.
export function demoGoalStatus(value: number, target: number | null, direction: GoalDirection): GoalStatus {
  if (target === null || !Number.isFinite(target) || target <= 0 || !Number.isFinite(value)) return "unset";
  if (direction === "minimum") return value >= target ? "met" : value >= target * 0.9 ? "attention" : "alert";
  return value <= target ? "met" : value <= target * 1.1 ? "attention" : "alert";
}