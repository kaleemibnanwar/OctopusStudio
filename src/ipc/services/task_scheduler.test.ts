import { describe, expect, it } from "vitest";
import { isTaskDue } from "./task_scheduler";

describe("isTaskDue", () => {
  it("returns false for manual tasks (no schedule)", () => {
    expect(isTaskDue({ scheduleMinutes: null, lastRunAt: null }, 1000)).toBe(
      false,
    );
  });

  it("returns true for a scheduled task that has never run", () => {
    expect(isTaskDue({ scheduleMinutes: 30, lastRunAt: null }, 1000)).toBe(
      true,
    );
  });

  it("returns false before the interval elapses", () => {
    const now = 1000;
    const lastRun = new Date(now - 15 * 60_000);
    expect(isTaskDue({ scheduleMinutes: 30, lastRunAt: lastRun }, now)).toBe(
      false,
    );
  });

  it("returns true after the interval elapses", () => {
    const now = 1000;
    const lastRun = new Date(now - 45 * 60_000);
    expect(isTaskDue({ scheduleMinutes: 30, lastRunAt: lastRun }, now)).toBe(
      true,
    );
  });
});
