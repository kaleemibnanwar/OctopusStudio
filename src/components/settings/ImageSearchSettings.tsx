import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { showSuccess, showError } from "@/lib/toast";
import type { Secret } from "@/lib/schemas";

type ImageSearchSecretField =
  | "pexelsApiKey"
  | "pixabayApiKey"
  | "openverseClientId"
  | "openverseClientSecret";

function ProviderSecretField({
  label,
  description,
  value,
  fieldKey,
  placeholder,
}: {
  label: string;
  description: string;
  value: Secret | undefined;
  fieldKey: ImageSearchSecretField;
  placeholder?: string;
}) {
  const { settings, updateSettings } = useSettings();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await updateSettings({
        imageSearch: {
          ...settings?.imageSearch,
          [fieldKey]: { value: trimmed },
        },
      });
      setInput("");
      showSuccess(`${label} saved`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await updateSettings({
        imageSearch: {
          ...settings?.imageSearch,
          [fieldKey]: undefined,
        },
      });
      showSuccess(`${label} removed`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  const masked = value ? `••••••${value.value.slice(-4)}` : "";

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div>
        <h4 className="text-sm font-medium text-foreground">{label}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? "Paste key…"}
          autoComplete="off"
          className="max-w-sm"
        />
        <Button size="sm" onClick={save} disabled={busy || !input.trim()}>
          {value ? "Update" : "Save"}
        </Button>
        {value && (
          <Button
            size="sm"
            variant="destructive"
            onClick={remove}
            disabled={busy}
          >
            Remove
          </Button>
        )}
      </div>
      {value && (
        <p className="mt-2 text-xs text-muted-foreground">
          Configured: {masked}
        </p>
      )}
    </div>
  );
}

export function ImageSearchSettings() {
  const { settings } = useSettings();
  const imageSearch = settings?.imageSearch;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Stock Image Search
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Configure one or more providers so the agent&apos;s{" "}
          <span className="font-mono">search_images</span> tool can find stock
          photos for your apps. Keys are stored encrypted.
        </p>
      </div>

      <ProviderSecretField
        label="Pexels API key"
        description="From pexels.com/api — used as the Authorization header."
        value={imageSearch?.pexelsApiKey}
        fieldKey="pexelsApiKey"
        placeholder="Pexels API key"
      />

      <ProviderSecretField
        label="Pixabay API key"
        description="From pixabay.com/api/docs — used as the key query parameter."
        value={imageSearch?.pixabayApiKey}
        fieldKey="pixabayApiKey"
        placeholder="Pixabay API key"
      />

      <ProviderSecretField
        label="Openverse client ID"
        description="From api.openverse.org — OAuth2 client credentials."
        value={imageSearch?.openverseClientId}
        fieldKey="openverseClientId"
        placeholder="Openverse client ID"
      />

      <ProviderSecretField
        label="Openverse client secret"
        description="Paired with the client ID to obtain a short-lived access token."
        value={imageSearch?.openverseClientSecret}
        fieldKey="openverseClientSecret"
        placeholder="Openverse client secret"
      />
    </div>
  );
}
