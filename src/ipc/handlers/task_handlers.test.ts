import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerTaskHandlers } from "./task_handlers";
import type { Task } from "../types/task";
import {
  setupHandlerTestHarness,
  type HandlerTestHarness,
} from "@/testing/handler_test_harness";

type ListTasksResult = {
  items: Task[];
  totalCount: number;
  page: number;
  pageSize: number;
};

describe("task handlers", () => {
  let harness: HandlerTestHarness;

  beforeEach(() => {
    harness = setupHandlerTestHarness();
    registerTaskHandlers();
  });

  afterEach(() => harness.dispose());

  it("creates and lists tasks", async () => {
    const created = await harness.invokeHandler<Task>("create-task", {
      title: "Morning brief",
      prompt: "Summarize my day",
      scheduleMinutes: 30,
    });
    expect(created.id).toBeDefined();
    expect(created.scheduleMinutes).toBe(30);
    expect(created.enabled).toBe(true);
    expect(created.totalTokens).toBe(0);

    const list = await harness.invokeHandler<ListTasksResult>("list-tasks", {
      page: 1,
      pageSize: 10,
    });
    expect(list.items).toHaveLength(1);
    expect(list.items[0].title).toBe("Morning brief");
    expect(list.totalCount).toBe(1);
    // The list is a lightweight fetch — token totals aren't joined in.
    expect(list.items[0].totalTokens).toBeNull();
  });

  it("paginates the task list", async () => {
    for (let i = 0; i < 15; i++) {
      await harness.invokeHandler<Task>("create-task", {
        title: `Task ${i}`,
        prompt: "P",
      });
    }

    const page1 = await harness.invokeHandler<ListTasksResult>("list-tasks", {
      page: 1,
      pageSize: 10,
    });
    expect(page1.items).toHaveLength(10);
    expect(page1.totalCount).toBe(15);

    const page2 = await harness.invokeHandler<ListTasksResult>("list-tasks", {
      page: 2,
      pageSize: 10,
    });
    expect(page2.items).toHaveLength(5);
    expect(page2.totalCount).toBe(15);

    // Newest first, and no overlap between pages.
    const page1Ids = new Set(page1.items.map((t) => t.id));
    for (const task of page2.items) {
      expect(page1Ids.has(task.id)).toBe(false);
    }
  });

  it("fetches a task's token total on demand", async () => {
    const created = await harness.invokeHandler<Task>("create-task", {
      title: "T",
      prompt: "P",
    });
    const total = await harness.invokeHandler<number>(
      "get-task-token-total",
      created.id,
    );
    // No chat has run yet, so there's nothing to sum.
    expect(total).toBe(0);
  });

  it("updates a task", async () => {
    const created = await harness.invokeHandler<Task>("create-task", {
      title: "T",
      prompt: "P",
    });
    const updated = await harness.invokeHandler<Task>("update-task", {
      taskId: created.id,
      enabled: false,
      title: "Renamed",
    });
    expect(updated.enabled).toBe(false);
    expect(updated.title).toBe("Renamed");
  });

  it("deletes a task", async () => {
    const created = await harness.invokeHandler<Task>("create-task", {
      title: "T",
      prompt: "P",
    });
    await harness.invokeHandler("delete-task", created.id);
    const list = await harness.invokeHandler<ListTasksResult>("list-tasks", {
      page: 1,
      pageSize: 10,
    });
    expect(list.items).toHaveLength(0);
    expect(list.totalCount).toBe(0);
  });
});
