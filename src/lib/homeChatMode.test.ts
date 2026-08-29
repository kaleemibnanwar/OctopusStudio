import { describe, expect, it } from "vitest";
import type { UserSettings } from "./schemas";
import { getHomeDefaultChatMode } from "./homeChatMode";

describe("getHomeDefaultChatMode", () => {
  it("uses local agent after OctopusStudio Pro setup", () => {
    const settings = {
      enableOctopusStudioPro: true,
      enableAutoUpdate: true,
      providerSettings: {
        auto: { apiKey: { value: "octopus-studio-pro-key" } },
      },
      releaseChannel: "stable",
      selectedModel: { provider: "auto", name: "auto" },
      selectedTemplateId: "react",
    } as UserSettings;

    expect(getHomeDefaultChatMode(settings, {})).toBe("local-agent");
  });

  it("downgrades an unavailable local-agent default to build", () => {
    const settings = {
      defaultChatMode: "local-agent",
      enableOctopusStudioPro: false,
      enableAutoUpdate: true,
      providerSettings: {},
      releaseChannel: "stable",
      selectedModel: { provider: "anthropic", name: "claude" },
      selectedTemplateId: "react",
    } as UserSettings;

    expect(getHomeDefaultChatMode(settings, {}, false)).toBe("build");
  });
});
