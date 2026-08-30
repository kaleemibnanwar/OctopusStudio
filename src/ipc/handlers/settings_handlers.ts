import { createTypedHandler } from "./base";
import { settingsContracts } from "../types/settings";
import { writeSettings, readEffectiveSettings } from "../../main/settings";
import { validateProviderApiKey } from "../services/provider_api_key_validation_service";
import { syncBrowserLimbBridge } from "../../main/browser_limb_manager";

export function registerSettingsHandlers() {
  // Note: Settings handlers intentionally use createTypedHandler without logging
  // to avoid logging sensitive data (API keys, tokens, etc.) from args/return values.

  createTypedHandler(settingsContracts.getUserSettings, async () => {
    return readEffectiveSettings();
  });

  createTypedHandler(settingsContracts.setUserSettings, async (_, settings) => {
    writeSettings(settings);
    const updated = await readEffectiveSettings();
    if (settings.enableBrowserLimbBridge !== undefined) {
      await syncBrowserLimbBridge(updated.enableBrowserLimbBridge !== false);
    }
    return updated;
  });

  createTypedHandler(
    settingsContracts.validateProviderApiKey,
    async (_, params) => {
      return validateProviderApiKey(params);
    },
  );
}
