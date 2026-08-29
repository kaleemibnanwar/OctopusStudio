import { useTranslation } from "react-i18next";
import { ipc } from "@/ipc/types";
import { KeyRound } from "lucide-react";

export function SetupOctopusStudioProButton() {
  const { t } = useTranslation("home");
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
      onClick={() => {
        ipc.system.openExternalUrl("https://academy.octopusStudio.sh/settings");
      }}
    >
      <KeyRound aria-hidden="true" className="size-3.5" />
      {t("proBanner.alreadyHavePro")}
    </button>
  );
}
