import { describe, expect, it, vi } from "vitest";
import { createDeepLinkQueue } from "@/main/deep_link_queue";

describe("createDeepLinkQueue", () => {
  it("queues deep links until the app is marked ready", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);

    queue.handle("octopusStudio://one");
    queue.handle("octopusStudio://two");

    expect(handler).not.toHaveBeenCalled();

    queue.markReady();

    expect(handler).toHaveBeenNthCalledWith(1, "octopusStudio://one");
    expect(handler).toHaveBeenNthCalledWith(2, "octopusStudio://two");
  });

  it("handles deep links immediately after the app is marked ready", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);

    queue.markReady();
    queue.handle("octopusStudio://ready");
    queue.markReady();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("octopusStudio://ready");
  });

  it("queues again while a newly targeted window is loading", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);
    queue.markReady();
    queue.markNotReady();

    queue.handle("octopusStudio://new-window");
    expect(handler).not.toHaveBeenCalled();

    queue.markReady();
    expect(handler).toHaveBeenCalledWith("octopusStudio://new-window");
  });
});
