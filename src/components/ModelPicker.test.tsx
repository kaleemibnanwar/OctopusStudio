import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelPicker } from "./ModelPicker";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  setChatMode: vi.fn(),
  setChatModelSelection: vi.fn(),
  setChatSelection: vi.fn(),
  updateSettings: vi.fn(),
  updateChat: vi.fn(),
  navigate: vi.fn(),
  posthogCapture: vi.fn(),
  openExternalUrl: vi.fn(),
  renderSubContent: false,
  settingsLoading: false,
  chatLoading: false,
  chat: null as null | {
    id: number;
    messages: Array<{ id: number }>;
    modelSelection?: {
      provider: string;
      name: string;
      effortLevel: string;
    };
  },
  pathname: "/",
  search: {} as { id?: number },
  envVars: {} as Record<string, string | undefined>,
  settings: {
    enableOctopusStudioPro: true,
    providerSettings: {
      auto: {
        apiKey: {
          value: "octopus-studio-pro-key",
        },
      },
      openrouter: {
        apiKey: {
          value: "",
        },
      },
    },
    selectedModel: {
      name: "auto",
      provider: "auto",
    },
    selectedChatMode: "build",
    defaultChatMode: "build",
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: mocks.settings,
    updateSettings: mocks.updateSettings,
    envVars: mocks.envVars,
    loading: mocks.settingsLoading,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({
    location: {
      pathname: mocks.pathname,
      search: mocks.search,
    },
  }),
  useNavigate: () => mocks.navigate,
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({
    capture: mocks.posthogCapture,
  }),
}));

vi.mock("@/ipc/types", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ipc: {
    chat: {
      updateChat: mocks.updateChat,
    },
    system: {
      openExternalUrl: mocks.openExternalUrl,
    },
  },
}));

vi.mock("@/hooks/useChatMode", () => ({
  useChatMode: () => ({
    chat: mocks.chat,
    isLoading: mocks.chatLoading,
    selectedMode: "build",
    setChatMode: mocks.setChatMode,
    setChatModelSelection: mocks.setChatModelSelection,
    setChatSelection: mocks.setChatSelection,
  }),
}));

vi.mock("@/hooks/useLanguageModelsByProviders", () => ({
  useLanguageModelsByProviders: () => ({
    isLoading: false,
    data: {
      auto: [
        {
          apiName: "auto",
          displayName: "Auto",
          description: "Automatically selects a model",
          type: "cloud",
        },
      ],
      openai: [
        {
          apiName: "gpt-5-mini",
          displayName: "GPT 5 Mini",
          description: "OpenAI smaller model",
          dollarSigns: 2,
          type: "cloud",
        },
        {
          apiName: "gpt-5",
          displayName: "GPT 5",
          description: "OpenAI model",
          dollarSigns: 3,
          effortSettings: {
            defaultEffortLevel: "minimal",
            possibleEffortLevels: ["minimal", "xhigh"],
          },
          type: "cloud",
        },
      ],
      openrouter: [
        {
          apiName: "anthropic/claude-sonnet-4.5",
          displayName: "Claude Sonnet 4.5",
          description: "OpenRouter paid model",
          dollarSigns: 2,
          type: "cloud",
        },
      ],
      xai: [
        {
          apiName: "grok-code-fast-1",
          displayName: "Grok Code Fast",
          description: "xAI model",
          type: "cloud",
        },
      ],
    },
  }),
}));

vi.mock("@/hooks/useLanguageModelProviders", () => ({
  useLanguageModelProviders: () => ({
    isLoading: false,
    isProviderSetup: (provider: string) => {
      if (provider === "openrouter") {
        return Boolean(
          mocks.settings.providerSettings.openrouter.apiKey.value ||
          mocks.envVars.OPENROUTER_API_KEY,
        );
      }
      if (provider === "openai") {
        return Boolean(mocks.envVars.OPENAI_API_KEY);
      }
      return false;
    },
    data: [
      { id: "auto", name: "OctopusStudio", type: "cloud" },
      { id: "openai", name: "OpenAI", type: "cloud" },
      { id: "openrouter", name: "OpenRouter", type: "cloud" },
      { id: "xai", name: "xAI", type: "cloud", secondary: true },
    ],
  }),
}));

vi.mock("@/hooks/useLocalModels", () => ({
  useLocalModels: () => ({
    models: [],
    loading: false,
    error: null,
    loadModels: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLMStudioModels", () => ({
  useLocalLMSModels: () => ({
    models: [],
    loading: false,
    error: null,
    loadModels: vi.fn(),
  }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: React.ReactElement }) => render,
  TooltipContent: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubTrigger: ({
    children,
    hideChevron: _hideChevron,
    ...props
  }: {
    children: React.ReactNode;
    hideChevron?: boolean;
  }) => <button {...props}>{children}</button>,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) =>
    mocks.renderSubContent ? <div>{children}</div> : null,
}));

describe("ModelPicker", () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset();
    mocks.setChatMode.mockReset();
    mocks.setChatMode.mockResolvedValue(undefined);
    mocks.setChatModelSelection.mockReset();
    mocks.setChatModelSelection.mockResolvedValue(undefined);
    mocks.setChatSelection.mockReset();
    mocks.setChatSelection.mockResolvedValue(undefined);
    mocks.updateSettings.mockReset();
    mocks.updateSettings.mockResolvedValue(mocks.settings);
    mocks.updateChat.mockReset();
    mocks.updateChat.mockResolvedValue(undefined);
    mocks.navigate.mockReset();
    mocks.posthogCapture.mockReset();
    mocks.openExternalUrl.mockReset();
    mocks.renderSubContent = false;
    mocks.settingsLoading = false;
    mocks.chatLoading = false;
    mocks.chat = null;
    mocks.pathname = "/";
    mocks.search = {};
    mocks.envVars = {};
    mocks.settings.providerSettings.auto.apiKey.value =
      "octopus-studio-pro-key";
    mocks.settings.providerSettings.openrouter.apiKey.value = "";
  });

  it("shows a message when no cloud providers are configured", () => {
    render(<ModelPicker />);

    expect(screen.getByText(/No providers configured/i)).toBeTruthy();
    // The full cloud catalog and Pro-only rows are not listed.
    expect(screen.queryByText("GPT 5")).toBeNull();
    expect(screen.queryByText("More models")).toBeNull();
    expect(screen.queryByText("OctopusStudio Free")).toBeNull();
    expect(
      screen.queryByText("Unlock all models with OctopusStudio Pro"),
    ).toBeNull();
  });

  it("only lists models from providers the user has set up", () => {
    mocks.settings.providerSettings.openrouter.apiKey.value = "openrouter-key";
    mocks.renderSubContent = true;

    render(<ModelPicker />);

    // The configured provider's models are shown, others are not.
    expect(screen.getByText("Claude Sonnet 4.5")).toBeTruthy();
    expect(screen.queryByText("GPT 5")).toBeNull();
    expect(screen.queryByText("Grok Code Fast")).toBeNull();
    expect(screen.queryByText("xAI")).toBeNull();
  });

  it("selects a model from a configured provider", async () => {
    mocks.settings.providerSettings.openrouter.apiKey.value = "openrouter-key";
    mocks.renderSubContent = true;

    render(<ModelPicker />);
    fireEvent.click(screen.getByText("Claude Sonnet 4.5").closest("button")!);

    expect(mocks.updateSettings).toHaveBeenCalledWith({
      selectedModel: expect.objectContaining({
        name: "anthropic/claude-sonnet-4.5",
        provider: "openrouter",
      }),
    });
    await waitFor(() => {
      expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1);
    });
  });

  it("selects a configured model with an explicit effort level", async () => {
    mocks.envVars.OPENAI_API_KEY = "openai-key";
    mocks.renderSubContent = true;

    render(<ModelPicker />);

    fireEvent.click(screen.getAllByText("GPT 5")[0].closest("button")!);
    fireEvent.click(screen.getAllByText("Xhigh")[0]);

    await waitFor(() => {
      expect(mocks.updateSettings).toHaveBeenCalledWith({
        selectedModel: { name: "gpt-5", provider: "openai" },
        modelEffortPreferences: {
          '["openai","gpt-5",null]': "xhigh",
        },
      });
    });
  });

  it("disables selection while an existing chat is still loading", () => {
    mocks.pathname = "/chat";
    mocks.search = { id: 42 };
    mocks.chatLoading = true;

    render(<ModelPicker />);

    expect(
      (screen.getByTestId("model-picker") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(mocks.updateSettings).not.toHaveBeenCalled();
    expect(mocks.updateChat).not.toHaveBeenCalled();
  });

  it("persists an established chat model through the optimistic mutation", async () => {
    mocks.pathname = "/chat";
    mocks.search = { id: 42 };
    mocks.chat = {
      id: 42,
      messages: [{ id: 1 }],
      modelSelection: {
        provider: "auto",
        name: "auto",
        effortLevel: "medium",
      },
    };
    mocks.envVars.OPENAI_API_KEY = "openai-key";
    mocks.renderSubContent = true;

    render(<ModelPicker />);
    fireEvent.click(screen.getAllByText("Xhigh")[0]);

    await waitFor(() => {
      expect(mocks.setChatSelection).toHaveBeenCalledWith({
        modelSelection: {
          provider: "openai",
          name: "gpt-5",
          effortLevel: "xhigh",
        },
      });
    });
    expect(mocks.updateChat).not.toHaveBeenCalled();
  });

  it("never shows Pro-gated rows, locks, or the upgrade footer", () => {
    mocks.settings.enableOctopusStudioPro = false;
    mocks.settings.providerSettings.auto.apiKey.value = "";
    mocks.settings.providerSettings.openrouter.apiKey.value = "openrouter-key";
    mocks.renderSubContent = true;

    render(<ModelPicker />);

    expect(document.querySelector("[data-locked]")).toBeNull();
    expect(screen.queryByText("OctopusStudio Free")).toBeNull();
    expect(screen.queryByText("Data sharing")).toBeNull();
    expect(
      screen.queryByText("Unlock all models with OctopusStudio Pro"),
    ).toBeNull();
    expect(screen.queryByText("Get OctopusStudio Pro")).toBeNull();
    expect(screen.queryByText(/requires OctopusStudio Pro/i)).toBeNull();
  });
});
