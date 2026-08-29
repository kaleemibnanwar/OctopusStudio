import { useState, useEffect, useRef } from "react";
import {
  ImageIcon,
  Box,
  Camera,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useUserBudgetInfo } from "@/hooks/useUserBudgetInfo";
import { useSettings } from "@/hooks/useSettings";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { AppSearchSelect } from "./AppSearchSelect";
import type { ImageThemeMode, LanguageModelProvider } from "@/ipc/types";
import type { LargeLanguageModel } from "@/lib/schemas";

const THEME_MODES: {
  value: ImageThemeMode;
  label: string;
  description: string;
  icon: typeof ImageIcon;
}[] = [
  {
    value: "plain",
    label: "Plain",
    description: "No style applied",
    icon: Sparkles,
  },
  {
    value: "3d-clay",
    label: "3D / Clay",
    description: "Soft, rounded clay aesthetic",
    icon: Box,
  },
  {
    value: "real-photography",
    label: "Photography",
    description: "Photorealistic DSLR quality",
    icon: Camera,
  },
  {
    value: "isometric-illustration",
    label: "Isometric",
    description: "Clean geometric illustrations",
    icon: Layers,
  },
];

export function ImageGeneratorDialog({
  open,
  onOpenChange,
  defaultAppId,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAppId?: number;
  source?: "chat" | "media-library";
}) {
  const [prompt, setPrompt] = useState("");
  const [themeMode, setThemeMode] = useState<ImageThemeMode>("plain");
  const [targetAppId, setTargetAppId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionAttemptRef = useRef(0);

  const { apps } = useLoadApps();
  const { start } = useGenerateImage();
  const { userBudget, isLoadingUserBudget: isBudgetLoading } =
    useUserBudgetInfo();
  const { settings, updateSettings } = useSettings();
  const { data: providers } = useLanguageModelProviders();

  const hasConfiguredImageModel = Boolean(settings?.selectedImageModel);
  const canGenerate = Boolean(userBudget) || hasConfiguredImageModel;

  // Sync defaultAppId only when dialog opens (not while already open)
  useEffect(() => {
    if (open && defaultAppId != null) {
      setTargetAppId(defaultAppId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      submissionAttemptRef.current += 1;
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(
    () => () => {
      submissionAttemptRef.current += 1;
    },
    [],
  );

  const effectiveTargetAppId =
    targetAppId ?? (apps.length === 1 ? apps[0].id : null);

  const handleGenerate = async () => {
    if (
      isSubmitting ||
      !prompt.trim() ||
      effectiveTargetAppId === null ||
      !canGenerate
    )
      return;

    const targetApp = apps.find((a) => a.id === effectiveTargetAppId);
    if (!targetApp) return;

    const attempt = submissionAttemptRef.current + 1;
    submissionAttemptRef.current = attempt;
    setIsSubmitting(true);
    const jobId = await start({
      prompt: prompt.trim(),
      themeMode,
      targetAppId: effectiveTargetAppId,
      targetAppName: targetApp.name,
      source,
    });

    if (submissionAttemptRef.current !== attempt) return;
    setIsSubmitting(false);
    if (jobId) handleOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      submissionAttemptRef.current += 1;
      setIsSubmitting(false);
      setPrompt("");
      setThemeMode("plain");
      setTargetAppId(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Generate Image
          </DialogTitle>
          <DialogDescription>
            Describe the image you want to generate and choose a visual style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isBudgetLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Model (only needed without a OctopusStudio Pro subscription) */}
              {!userBudget && (
                <ImageModelConfigSection
                  providers={providers}
                  selectedImageModel={settings?.selectedImageModel}
                  onSave={(model) =>
                    updateSettings({ selectedImageModel: model })
                  }
                />
              )}

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="image-prompt">Prompt</Label>
                <Textarea
                  id="image-prompt"
                  placeholder="Describe the image you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Theme Mode Selector */}
              <div className="space-y-2">
                <Label>Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = themeMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setThemeMode(mode.value)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}
                          >
                            {mode.label}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {mode.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target App Selector */}
              <div className="space-y-2">
                <Label>Save to App</Label>
                <AppSearchSelect
                  apps={apps}
                  selectedAppId={effectiveTargetAppId}
                  onSelect={setTargetAppId}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {!canGenerate ? (
              <p className="text-xs text-muted-foreground">
                Configure an image model above to generate images.
              </p>
            ) : !prompt.trim() || effectiveTargetAppId === null ? (
              <p className="text-xs text-muted-foreground">
                {!prompt.trim() && effectiveTargetAppId === null
                  ? "Enter a prompt and select an app"
                  : !prompt.trim()
                    ? "Enter a prompt to generate"
                    : "Select an app to save to"}
              </p>
            ) : null}
            <Button
              onClick={handleGenerate}
              disabled={
                isSubmitting ||
                !prompt.trim() ||
                effectiveTargetAppId === null ||
                !canGenerate
              }
            >
              {isSubmitting ? "Starting..." : "Generate"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Providers with image generation wired up in getImageModelClient. Custom
 * providers (e.g. Gemini/ChatGPT models proxied through a local
 * OpenAI-compatible server) are always offered in addition to these.
 */
const BUILTIN_IMAGE_PROVIDER_IDS = new Set([
  "openai",
  "google",
  "openrouter",
  "lmstudio",
  "minimax",
]);

function ImageModelConfigSection({
  providers,
  selectedImageModel,
  onSave,
}: {
  providers: LanguageModelProvider[] | undefined;
  selectedImageModel: LargeLanguageModel | undefined;
  onSave: (model: LargeLanguageModel) => void;
}) {
  const [provider, setProvider] = useState(selectedImageModel?.provider ?? "");
  const [modelName, setModelName] = useState(selectedImageModel?.name ?? "");

  const eligibleProviders = (providers ?? []).filter(
    (p) => p.type === "custom" || BUILTIN_IMAGE_PROVIDER_IDS.has(p.id),
  );

  const hasChanges =
    provider !== (selectedImageModel?.provider ?? "") ||
    modelName.trim() !== (selectedImageModel?.name ?? "");

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Label>Image model</Label>
      <p className="text-xs text-muted-foreground">
        No OctopusStudio Pro subscription needed — pick any configured provider
        (including a custom provider pointed at a local
        Gemini/ChatGPT-compatible server) and its image model.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {eligibleProviders.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Model id (e.g. gpt-image-1, gemini-2.5-flash-image)"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!provider || !modelName.trim() || !hasChanges}
          onClick={() => onSave({ provider, name: modelName.trim() })}
        >
          Save
        </Button>
      </div>
      {selectedImageModel && !hasChanges && (
        <p className="text-xs text-muted-foreground">
          Using {selectedImageModel.provider} / {selectedImageModel.name}
        </p>
      )}
    </div>
  );
}
