import { createTypedHandler } from "./base";
import { templateContracts } from "../types/templates";

export function registerThemesHandlers() {
  createTypedHandler(templateContracts.getThemes, async () => {
    return [];
  });

  createTypedHandler(templateContracts.getCustomThemes, async () => {
    return [];
  });

  createTypedHandler(templateContracts.getAppTheme, async () => {
    return null;
  });

  createTypedHandler(templateContracts.setAppTheme, async () => {
    // noop
  });

  createTypedHandler(
    templateContracts.getThemeGenerationModelOptions,
    async () => {
      return [];
    },
  );

  createTypedHandler(templateContracts.createCustomTheme, async () => {
    return null as any;
  });

  createTypedHandler(templateContracts.updateCustomTheme, async () => {
    return null as any;
  });

  createTypedHandler(templateContracts.deleteCustomTheme, async () => {});

  createTypedHandler(templateContracts.generateThemePrompt, async () => {
    return { prompt: "" };
  });

  createTypedHandler(templateContracts.generateThemeFromUrl, async () => {
    return { prompt: "" };
  });

  createTypedHandler(templateContracts.saveThemeImage, async () => {
    return { path: "" };
  });

  createTypedHandler(templateContracts.cleanupThemeImages, async () => {});
}
