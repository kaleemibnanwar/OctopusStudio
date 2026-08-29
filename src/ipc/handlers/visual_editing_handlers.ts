import { createTypedHandler } from "./base";
import { visualEditingContracts } from "../types/visual-editing";

export function registerVisualEditingHandlers() {
  createTypedHandler(visualEditingContracts.applyChanges, async () => {
    // noop
  });

  createTypedHandler(visualEditingContracts.analyzeComponent, async () => {
    return { isDynamic: false, hasStaticText: false, hasImage: false };
  });
}
