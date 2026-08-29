import { SettingField } from "@/components/settings/SettingField";
import { ModelPicker } from "@/components/ModelPicker";

/**
 * Settings-page control for `settings.selectedModel` — the fallback model used
 * for new chats and for anything (Tasks, Worker personas) that doesn't pick
 * its own. Reuses ModelPicker itself: outside an established chat route it
 * already writes straight to `settings.selectedModel`.
 */
export function DefaultModelSetting() {
  return (
    <SettingField
      label="Default Model"
      description="Used for new chats, and for tasks or worker personas that don't set their own model."
    >
      <div className="inline-flex w-full items-center rounded-lg border border-input bg-transparent px-1 py-0.5 sm:w-[240px]">
        <ModelPicker />
      </div>
    </SettingField>
  );
}
