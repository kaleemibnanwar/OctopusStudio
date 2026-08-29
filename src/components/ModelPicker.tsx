import { type LargeLanguageModel } from "@/lib/schemas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useLocalModels } from "@/hooks/useLocalModels";
import { useLocalLMSModels } from "@/hooks/useLMStudioModels";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";

import { type LanguageModel, LocalModel } from "@/ipc/types";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useRouterState } from "@tanstack/react-router";
import { useChatMode } from "@/hooks/useChatMode";
import {
  createModelSelection,
  formatEffortLevel,
  getEffortSettings,
  getModelPreferenceKey,
} from "@/lib/modelEffort";

const SCROLL_AREA_CLASS = "max-h-100 overflow-y-auto scrollbar-on-hover";

export function ModelPicker() {
  const { settings, updateSettings } = useSettings();
  const routerState = useRouterState();
  const isChatRoute = routerState.location.pathname === "/chat";
  const chatId = routerState.location.search.id as number | undefined;
  const {
    chat,
    isLoading: chatLoading,
    setChatSelection,
  } = useChatMode(isChatRoute ? chatId : null);
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const hasEstablishedChat = Boolean(
    chat && (chat.modelSelection || chat.messages.length > 0),
  );

  const onModelSelect = async ({
    model,
    catalogModel,
    effortLevel,
    rememberEffort = false,
  }: {
    model: LargeLanguageModel;
    catalogModel?: LanguageModel | null;
    effortLevel?: string;
    rememberEffort?: boolean;
  }) => {
    if (!settings || (isChatRoute && chatId != null && chatLoading)) return;
    const modelSelection = createModelSelection({
      model,
      catalogModel,
      preferredEffortLevel:
        effortLevel ??
        settings.modelEffortPreferences?.[getModelPreferenceKey(model)],
    });
    posthog.capture("model-picker:select", {
      provider: model.provider,
      model: model.name,
      effortLevel: modelSelection.effortLevel,
    });

    const preferenceUpdate = rememberEffort
      ? {
          modelEffortPreferences: {
            ...settings.modelEffortPreferences,
            [getModelPreferenceKey(model)]: modelSelection.effortLevel,
          },
        }
      : {};
    if (hasEstablishedChat && chatId) {
      await Promise.all([
        setChatSelection({ modelSelection }),
        rememberEffort ? updateSettings(preferenceUpdate) : Promise.resolve(),
      ]);
    } else {
      await updateSettings({
        selectedModel: model,
        ...preferenceUpdate,
      });
    }
    // Invalidate token count when model changes since different models have different context windows
    // (technically they have different tokenizers, but we don't keep track of that).
    queryClient.invalidateQueries({ queryKey: queryKeys.tokenCount.all });
  };

  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      posthog.capture("model-picker:open");
    }
  };

  // Cloud models from providers
  const { data: modelsByProviders, isLoading: modelsByProvidersLoading } =
    useLanguageModelsByProviders();

  const {
    data: providers,
    isLoading: providersLoading,
    isProviderSetup,
  } = useLanguageModelProviders();

  const loading = modelsByProvidersLoading || providersLoading;

  // Ollama Models Hook
  const {
    models: ollamaModels,
    loading: ollamaLoading,
    error: ollamaError,
    loadModels: loadOllamaModels,
  } = useLocalModels();

  // LM Studio Models Hook
  const {
    models: lmStudioModels,
    loading: lmStudioLoading,
    error: lmStudioError,
    loadModels: loadLMStudioModels,
  } = useLocalLMSModels();

  // Load models when the dropdown opens
  useEffect(() => {
    if (open) {
      loadOllamaModels();
      loadLMStudioModels();
    }
  }, [open, loadOllamaModels, loadLMStudioModels]);

  // Get display name for the selected model
  const selectedModel: LargeLanguageModel = chat?.modelSelection ??
    settings?.selectedModel ?? {
      provider: "auto",
      name: "auto",
    };

  const getModelDisplayName = () => {
    if (selectedModel.provider === "ollama") {
      return (
        ollamaModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name
      );
    }
    if (selectedModel.provider === "lmstudio") {
      return (
        lmStudioModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name // Fallback to path if not found
      );
    }

    // For cloud models, look up in the modelsByProviders data
    if (modelsByProviders && modelsByProviders[selectedModel.provider]) {
      const customFoundModel = modelsByProviders[selectedModel.provider].find(
        (model) =>
          model.type === "custom" && model.id === selectedModel.customModelId,
      );
      if (customFoundModel) {
        return customFoundModel.displayName;
      }
      const foundModel = modelsByProviders[selectedModel.provider].find(
        (model) => model.apiName === selectedModel.name,
      );
      if (foundModel) {
        return foundModel.displayName;
      }
    }

    // Fallback if not found
    return selectedModel.name;
  };

  // Determine availability of local models
  const hasOllamaModels =
    !ollamaLoading && !ollamaError && ollamaModels.length > 0;
  const hasLMStudioModels =
    !lmStudioLoading && !lmStudioError && lmStudioModels.length > 0;

  if (!settings) {
    return null;
  }
  const selectedCatalogModel = modelsByProviders?.[
    selectedModel.provider
  ]?.find((model) =>
    selectedModel.customModelId
      ? model.type === "custom" && model.id === selectedModel.customModelId
      : model.apiName === selectedModel.name,
  );
  const selectedEffortLevel = createModelSelection({
    model: selectedModel,
    catalogModel: selectedCatalogModel,
    preferredEffortLevel:
      chat?.modelSelection?.effortLevel ??
      settings.modelEffortPreferences?.[getModelPreferenceKey(selectedModel)],
  }).effortLevel;
  const modelDisplayName = `${getModelDisplayName()} (${formatEffortLevel(selectedEffortLevel)})`;

  const getProviderDisplayName = (providerId: string) => {
    const provider = providers?.find((p) => p.id === providerId);
    return provider?.name ?? providerId;
  };

  const handleCloudModelSelect = (
    providerId: string,
    model: LanguageModel,
    effortLevel?: string,
  ) => {
    const customModelId = model.type === "custom" ? model.id : undefined;
    void onModelSelect({
      model: {
        name: model.apiName,
        provider: providerId,
        customModelId,
      },
      catalogModel: model,
      effortLevel,
      rememberEffort: effortLevel !== undefined,
    });
    setOpen(false);
  };

  const renderCloudModelItem = ({
    providerId,
    model,
    showProvider = false,
  }: {
    providerId: string;
    model: LanguageModel;
    showProvider?: boolean;
  }) => {
    const isSelected =
      selectedModel.provider === providerId &&
      selectedModel.name === model.apiName;
    const modelRef = {
      name: model.apiName,
      provider: providerId,
      customModelId: model.type === "custom" ? model.id : undefined,
    };
    const effortSettings = getEffortSettings(model);
    const currentEffort = isSelected
      ? selectedEffortLevel
      : createModelSelection({
          model: modelRef,
          catalogModel: model,
          preferredEffortLevel:
            settings.modelEffortPreferences?.[getModelPreferenceKey(modelRef)],
        }).effortLevel;
    const effortLabel = formatEffortLevel(currentEffort);
    const unlockedAriaLabel = [
      model.displayName,
      showProvider ? getProviderDisplayName(providerId) : null,
      isSelected ? "Selected" : null,
      `Effort: ${effortLabel}`,
      "Press Enter to select; press Right Arrow to configure effort",
    ]
      .filter(Boolean)
      .join(". ");

    const rowContent = (
      <div className="flex justify-between items-center gap-2 w-full">
        <span className="min-w-0 flex items-center gap-2">
          <ProviderIcon providerId={providerId} apiName={model.apiName} />
          <span className="min-w-0 flex flex-col items-start">
            <span className="text-[13px] truncate leading-tight">
              {model.displayName}
            </span>
            {showProvider && (
              <span className="text-xs text-muted-foreground truncate">
                {getProviderDisplayName(providerId)}
              </span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {isSelected && (
            <CheckIcon className="size-3.5 text-primary shrink-0" />
          )}
          <span data-effort-level className="text-xs text-muted-foreground">
            {effortLabel}
          </span>
          <span
            data-effort-chevron
            className="-mr-1 flex size-6 items-center justify-center rounded-sm hover:bg-muted"
            aria-hidden="true"
          >
            <ChevronRightIcon className="size-4" />
          </span>
        </span>
      </div>
    );

    const commonProps = {
      "data-model-provider": providerId,
      "data-model-name": model.apiName,
      className: cn(
        "relative px-2 py-1.5",
        isSelected &&
          "bg-primary/8 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary",
      ),
    };

    const item = (
      <DropdownMenuSubTrigger
        key={`${providerId}-${model.apiName}`}
        {...commonProps}
        aria-label={`${unlockedAriaLabel}.`}
        hideChevron
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest("[data-effort-chevron]")) {
            handleCloudModelSelect(providerId, model);
          }
        }}
      >
        {rowContent}
      </DropdownMenuSubTrigger>
    );

    const itemWithTooltip = model.description ? (
      <Tooltip key={`${providerId}-${model.apiName}`}>
        <TooltipTrigger render={item} />
        <TooltipContent side="left" align="start">
          <span className="max-w-64">{model.description}</span>
        </TooltipContent>
      </Tooltip>
    ) : (
      item
    );

    return (
      <DropdownMenuSub key={`${providerId}-${model.apiName}`}>
        {itemWithTooltip}
        <DropdownMenuSubContent className="w-52">
          <DropdownMenuLabel>Effort</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {effortSettings.possibleEffortLevels.map((effortLevel) => (
            <DropdownMenuItem
              key={effortLevel}
              onClick={() =>
                handleCloudModelSelect(providerId, model, effortLevel)
              }
            >
              <span>{formatEffortLevel(effortLevel)}</span>
              {effortLevel === effortSettings.defaultEffortLevel && (
                <span className="text-xs text-muted-foreground">(default)</span>
              )}
              {effortLevel === currentEffort && (
                <CheckIcon className="ml-auto size-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  const renderProviderSubmenu = (
    providerId: string,
    models: LanguageModel[],
  ) => {
    if (models.length === 0) {
      return null;
    }
    const providerDisplayName = getProviderDisplayName(providerId);

    return (
      <DropdownMenuSub key={providerId}>
        <DropdownMenuSubTrigger className="w-full font-normal">
          <div className="flex flex-col items-start w-full">
            <div className="flex items-center gap-2">
              <span>{providerDisplayName}</span>
              {providerId === "auto" ? null : (
                <span className="text-xs text-muted-foreground">
                  {models.length} models
                </span>
              )}
            </div>
          </div>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className={cn("w-64", SCROLL_AREA_CLASS)}>
          <DropdownMenuLabel>
            {providerDisplayName + " Models"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {models.map((model) => renderCloudModelItem({ providerId, model }))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  const renderLocalModelItem = (
    providerId: "ollama" | "lmstudio",
    model: LocalModel,
  ) => {
    const modelRef = { name: model.modelName, provider: providerId };
    const isSelected =
      selectedModel.provider === providerId &&
      selectedModel.name === model.modelName;
    const effortSettings = getEffortSettings();
    const currentEffort = isSelected
      ? selectedEffortLevel
      : createModelSelection({
          model: modelRef,
          preferredEffortLevel:
            settings.modelEffortPreferences?.[getModelPreferenceKey(modelRef)],
        }).effortLevel;
    const effortLabel = formatEffortLevel(currentEffort);
    const selectLocalModel = (effortLevel?: string) => {
      void onModelSelect({
        model: modelRef,
        effortLevel,
        rememberEffort: effortLevel !== undefined,
      });
      setOpen(false);
    };

    return (
      <DropdownMenuSub key={`${providerId}-${model.modelName}`}>
        <DropdownMenuSubTrigger
          hideChevron
          aria-label={`${model.displayName}. Effort: ${effortLabel}. Press Enter to select; press Right Arrow to configure effort.`}
          className={cn(
            "relative py-1.5 w-full",
            isSelected &&
              "bg-primary/8 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary",
          )}
          onClick={(event) => {
            if (
              !(event.target as HTMLElement).closest("[data-effort-chevron]")
            ) {
              selectLocalModel();
            }
          }}
        >
          <div className="flex w-full items-center gap-2">
            <ProviderIcon providerId={providerId} />
            <div className="min-w-0 flex flex-col items-start">
              <span className="text-[13px] leading-tight">
                {model.displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {model.modelName}
              </span>
            </div>
            {isSelected && (
              <CheckIcon className="ml-auto size-3.5 text-primary shrink-0" />
            )}
            <span
              data-effort-level
              className={cn(
                "text-xs text-muted-foreground",
                !isSelected && "ml-auto",
              )}
            >
              {effortLabel}
            </span>
            <span
              data-effort-chevron
              className="-mr-1 flex size-6 items-center justify-center rounded-sm hover:bg-muted"
              aria-hidden="true"
            >
              <ChevronRightIcon className="size-4" />
            </span>
          </div>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-52">
          <DropdownMenuLabel>Effort</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {effortSettings.possibleEffortLevels.map((effortLevel) => (
            <DropdownMenuItem
              key={effortLevel}
              onClick={() => selectLocalModel(effortLevel)}
            >
              <span>{formatEffortLevel(effortLevel)}</span>
              {effortLevel === effortSettings.defaultEffortLevel && (
                <span className="text-xs text-muted-foreground">(default)</span>
              )}
              {effortLevel === currentEffort && (
                <CheckIcon className="ml-auto size-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  // Only providers that the user has manually set up (own API key / local)
  // are listed. The full cloud catalog is intentionally not shown.
  const configuredProviderEntries =
    !loading && modelsByProviders
      ? Object.entries(modelsByProviders)
          .filter(([providerId]) => providerId !== "auto")
          .filter(([providerId]) => isProviderSetup(providerId))
          .filter(([, models]) => models.length > 0)
      : [];

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger
          disabled={isChatRoute && chatId != null && chatLoading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-none bg-transparent shadow-none text-foreground/80 hover:text-foreground hover:bg-muted/60 h-7 max-w-[220px] px-2 gap-1.5 cursor-pointer"
          data-testid="model-picker"
          title={modelDisplayName}
        >
          <span className="truncate">
            {getModelDisplayName() === "Auto" && (
              <>
                <span className="text-xs text-muted-foreground/70">
                  Model:
                </span>{" "}
              </>
            )}
            {modelDisplayName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[17rem]" align="start">
          {loading ? (
            <div className="text-xs text-center py-2 text-muted-foreground">
              Loading models...
            </div>
          ) : !modelsByProviders ||
            Object.keys(modelsByProviders).length === 0 ? (
            <div className="text-xs text-center py-2 text-muted-foreground">
              No models available
            </div>
          ) : (
            <>
              {/* Manually configured cloud providers */}
              {configuredProviderEntries.length === 0 ? (
                <div className="text-xs text-center py-2 text-muted-foreground px-3">
                  No providers configured. Add an API key in provider settings
                  to see cloud models.
                </div>
              ) : (
                <>
                  {configuredProviderEntries.map(([providerId, models]) =>
                    renderProviderSubmenu(providerId, models),
                  )}
                </>
              )}
            </>
          )}

          {/* Local Models */}
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="w-full font-normal">
                <span>Local models</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {/* Ollama Models SubMenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    disabled={ollamaLoading && !hasOllamaModels}
                    className="w-full font-normal"
                  >
                    <div className="flex flex-col items-start">
                      <span>Ollama</span>
                      {ollamaLoading ? (
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      ) : ollamaError ? (
                        <span className="text-xs text-red-500">
                          Error loading
                        </span>
                      ) : !hasOllamaModels ? (
                        <span className="text-xs text-muted-foreground">
                          None available
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {ollamaModels.length} models
                        </span>
                      )}
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className={cn("w-64", SCROLL_AREA_CLASS)}
                  >
                    <DropdownMenuLabel>Ollama Models</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ollamaLoading && ollamaModels.length === 0 ? (
                      <div className="text-xs text-center py-2 text-muted-foreground">
                        Loading models...
                      </div>
                    ) : ollamaError ? (
                      <div className="px-2 py-1.5 text-sm text-red-600">
                        <div className="flex flex-col">
                          <span>Error loading models</span>
                          <span className="text-xs text-muted-foreground">
                            Is Ollama running?
                          </span>
                        </div>
                      </div>
                    ) : !hasOllamaModels ? (
                      <div className="px-2 py-1.5 text-sm">
                        <div className="flex flex-col">
                          <span>No local models found</span>
                          <span className="text-xs text-muted-foreground">
                            Ensure Ollama is running and models are pulled.
                          </span>
                        </div>
                      </div>
                    ) : (
                      ollamaModels.map((model: LocalModel) =>
                        renderLocalModelItem("ollama", model),
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* LM Studio Models SubMenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    disabled={lmStudioLoading && !hasLMStudioModels}
                    className="w-full font-normal"
                  >
                    <div className="flex flex-col items-start">
                      <span>LM Studio</span>
                      {lmStudioLoading ? (
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      ) : lmStudioError ? (
                        <span className="text-xs text-red-500">
                          Error loading
                        </span>
                      ) : !hasLMStudioModels ? (
                        <span className="text-xs text-muted-foreground">
                          None available
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {lmStudioModels.length} models
                        </span>
                      )}
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className={cn("w-64", SCROLL_AREA_CLASS)}
                  >
                    <DropdownMenuLabel>LM Studio Models</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {lmStudioLoading && lmStudioModels.length === 0 ? (
                      <div className="text-xs text-center py-2 text-muted-foreground">
                        Loading models...
                      </div>
                    ) : lmStudioError ? (
                      <div className="px-2 py-1.5 text-sm text-red-600">
                        <div className="flex flex-col">
                          <span>Error loading models</span>
                          <span className="text-xs text-muted-foreground">
                            {lmStudioError.message}
                          </span>
                        </div>
                      </div>
                    ) : !hasLMStudioModels ? (
                      <div className="px-2 py-1.5 text-sm">
                        <div className="flex flex-col">
                          <span>No loaded models found</span>
                          <span className="text-xs text-muted-foreground">
                            Ensure LM Studio is running and models are loaded.
                          </span>
                        </div>
                      </div>
                    ) : (
                      lmStudioModels.map((model: LocalModel) =>
                        renderLocalModelItem("lmstudio", model),
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
