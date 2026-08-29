import { Users, RefreshCw } from "lucide-react";

export function WorkersList({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold tracking-wider uppercase opacity-75">
          Workers
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Manage and monitor automated employee personas, set shift schedules,
          and review generated reports.
        </p>

        <div className="rounded-lg border border-sidebar-border p-3 space-y-2 bg-sidebar-accent/30">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Active Agency
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Assign projects independently to different multi-persona squads.
          </p>
        </div>
      </div>
    </div>
  );
}
