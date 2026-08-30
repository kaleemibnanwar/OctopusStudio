import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";

export function BrowserLimbBridgeSwitch() {
  const { settings, updateSettings } = useSettings();
  const isEnabled = settings?.enableBrowserLimbBridge !== false;

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Switch
          id="enable-browser-limb-bridge"
          aria-label="Enable OctoLimb MCP Bridge"
          checked={isEnabled}
          onCheckedChange={(checked) => {
            updateSettings({
              enableBrowserLimbBridge: checked,
            });
          }}
        />
        <Label htmlFor="enable-browser-limb-bridge">
          Enable OctoLimb MCP Bridge
        </Label>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Automatically run the background local HTTP bridge for Octopus Studio OctoLimb extension and register its MCP server endpoint.
      </div>
    </div>
  );
}
