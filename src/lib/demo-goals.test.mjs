import { test, expect } from "bun:test";
import { demoGoalStatus } from "./demo-goals.ts";

test("minimum preview goals distinguish met, near and below target", () => {
  expect(demoGoalStatus(95, 95, "minimum")).toBe("met");
  expect(demoGoalStatus(90, 95, "minimum")).toBe("attention");
  expect(demoGoalStatus(80, 95, "minimum")).toBe("alert");
});
test("maximum preview goals distinguish within limit and cost overruns", () => {
  expect(demoGoalStatus(60, 60, "maximum")).toBe("met");
  expect(demoGoalStatus(65, 60, "maximum")).toBe("attention");
  expect(demoGoalStatus(70, 60, "maximum")).toBe("alert");
});
test("missing budgets never receive a positive status", () => {
  expect(demoGoalStatus(55089, null, "maximum")).toBe("unset");
  expect(demoGoalStatus(55089, 0, "maximum")).toBe("unset");
});