import { describe, expect, it, vi } from "vitest";
import { createAppRelaunchRequest } from "@/main/app_relaunch_request";

describe("app relaunch request", () => {
  it("completes an uninterrupted quit without relaunching", () => {
    const request = createAppRelaunchRequest();
    const relaunch = vi.fn();
    const quit = vi.fn();

    request.finish({ currentArgs: [], relaunch, quit });

    expect(relaunch).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledOnce();
  });

  it("coalesces generic reopen requests into one relaunch", () => {
    const request = createAppRelaunchRequest();
    const relaunch = vi.fn();
    const quit = vi.fn();

    expect(request.request()).toBe(true);
    expect(request.request()).toBe(false);
    request.finish({
      currentArgs: ["--original-argument", "octopusStudio://stale"],
      relaunch,
      quit,
    });

    expect(relaunch).toHaveBeenCalledOnce();
    expect(relaunch).toHaveBeenCalledWith({ args: ["--original-argument"] });
    expect(quit).toHaveBeenCalledOnce();
  });

  it("preserves a shutdown-time deep link in the replacement process", () => {
    const request = createAppRelaunchRequest();
    const relaunch = vi.fn();
    const deepLinkUrl = "octopusStudio://oauth-return?code=new";

    request.request();
    request.request({ deepLinkUrl });
    request.finish({
      currentArgs: [
        "/path/to/main.js",
        "--original-argument",
        "octopusStudio://oauth-return?code=stale",
      ],
      relaunch,
      quit: vi.fn(),
    });

    expect(relaunch).toHaveBeenCalledWith({
      args: ["/path/to/main.js", "--original-argument", deepLinkUrl],
    });
  });

  it("keeps the first deep link when shutdown receives repeated requests", () => {
    const request = createAppRelaunchRequest();
    const relaunch = vi.fn();

    request.request({ deepLinkUrl: "octopusStudio://first" });
    request.request({ deepLinkUrl: "octopusStudio://second" });
    request.finish({ currentArgs: [], relaunch, quit: vi.fn() });

    expect(relaunch).toHaveBeenCalledWith({ args: ["octopusStudio://first"] });
  });
});
