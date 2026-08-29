import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ipc } from "@/ipc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showError, showSuccess } from "@/lib/toast";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";
import { useLoadApps } from "@/hooks/useLoadApps";
import { createModelSelection } from "@/lib/modelEffort";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Loader2,
  Pencil,
  Play,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";

type Task = Awaited<ReturnType<typeof ipc.task.listTasks>>["items"][number];

const TASKS_PAGE_SIZE = 10;

type SchedulePreset = "manual" | "hourly" | "daily" | "weekly" | "custom";

const PRESET_MINUTES: Record<
  Exclude<SchedulePreset, "custom" | "manual">,
  number
> = {
  hourly: 60,
  daily: 1440,
  weekly: 10080,
};

const PRESET_OPTIONS: { value: SchedulePreset; label: string; hint: string }[] =
  [
    { value: "manual", label: "Manual", hint: "Run on demand" },
    { value: "hourly", label: "Hourly", hint: "Every 60 min" },
    { value: "daily", label: "Daily", hint: "Every 24 h" },
    { value: "weekly", label: "Weekly", hint: "Every 7 days" },
    { value: "custom", label: "Custom", hint: "Set interval" },
  ];

function minutesToPreset(minutes: number | null): {
  preset: SchedulePreset;
  custom: string;
} {
  if (minutes == null) return { preset: "manual", custom: "" };
  for (const [key, value] of Object.entries(PRESET_MINUTES)) {
    if (value === minutes) return { preset: key as SchedulePreset, custom: "" };
  }
  return { preset: "custom", custom: String(minutes) };
}

function formatSchedule(minutes: number | null): string {
  if (minutes == null) return "Manual";
  if (minutes === 60) return "Hourly";
  if (minutes === 1440) return "Daily";
  if (minutes === 10080) return "Weekly";
  if (minutes % 1440 === 0) {
    return `Every ${minutes / 1440} day${minutes / 1440 > 1 ? "s" : ""}`;
  }
  if (minutes % 60 === 0) {
    return `Every ${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`;
  }
  return `Every ${minutes} min`;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never run";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TaskFormState {
  title: string;
  prompt: string;
  preset: SchedulePreset;
  customMinutes: string;
  projectId: string; // "default" = default chat project
  mcpServerIds: Set<number>;
  modelSelection: string; // "default" = default model
  enabled: boolean;
}

function emptyForm(): TaskFormState {
  return {
    title: "",
    prompt: "",
    preset: "manual",
    customMinutes: "",
    projectId: "default",
    mcpServerIds: new Set(),
    modelSelection: "default",
    enabled: true,
  };
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [tokenTotals, setTokenTotals] = useState<Record<number, number>>({});
  const [loadingTokenIds, setLoadingTokenIds] = useState<Set<number>>(
    new Set(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm());
  const [mcpServers, setMcpServers] = useState<
    Awaited<ReturnType<typeof ipc.mcp.listServers>>
  >([]);
  const [directoryBusy, setDirectoryBusy] = useState(false);

  const { data: modelsByProviders } = useLanguageModelsByProviders();
  const { apps, refreshApps } = useLoadApps();

  const modelOptions = useMemo(() => {
    if (!modelsByProviders) return [];
    const options: { value: string; label: string }[] = [];
    for (const [provider, models] of Object.entries(modelsByProviders)) {
      for (const model of models) {
        const selection = createModelSelection({
          model: { provider, name: model.apiName },
          catalogModel: model,
          preferredEffortLevel: null,
        });
        options.push({
          value: JSON.stringify(selection),
          label: `${provider}: ${model.displayName || model.apiName}`,
        });
      }
    }
    return options;
  }, [modelsByProviders]);

  const projectOptions = useMemo(
    () =>
      [...apps]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((app) => ({
          id: app.id,
          label: app.name,
          type: app.type,
          directory: app.directory ?? null,
        })),
    [apps],
  );

  const codeProjects = projectOptions.filter((p) => p.type === "app");
  const chatProjects = projectOptions.filter((p) => p.type === "chat");

  const selectedProject = useMemo(
    () =>
      form.projectId === "default"
        ? null
        : (projectOptions.find((p) => String(p.id) === form.projectId) ?? null),
    [form.projectId, projectOptions],
  );
  const isCodelessSelected = selectedProject?.type === "chat";

  const chooseDirectory = async () => {
    try {
      const { path: picked, canceled } = await ipc.chatProject.pickDirectory();
      if (canceled || !picked || !selectedProject) return;
      setDirectoryBusy(true);
      await ipc.chatProject.setDirectory({
        projectId: selectedProject.id,
        directory: picked,
      });
      await refreshApps();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to choose directory",
      );
    } finally {
      setDirectoryBusy(false);
    }
  };

  const clearDirectory = async () => {
    if (!selectedProject) return;
    try {
      setDirectoryBusy(true);
      await ipc.chatProject.setDirectory({
        projectId: selectedProject.id,
        directory: null,
      });
      await refreshApps();
    } catch {
      showError("Failed to clear directory");
    } finally {
      setDirectoryBusy(false);
    }
  };

  const load = async (targetPage: number = page) => {
    const result = await ipc.task.listTasks({
      page: targetPage,
      pageSize: TASKS_PAGE_SIZE,
    });
    setTasks(result.items);
    setTotalCount(result.totalCount);
    // A delete can empty out the last page — step back rather than show blank.
    if (result.items.length === 0 && targetPage > 1) {
      setPage(targetPage - 1);
    }
  };

  useEffect(() => {
    void ipc.mcp
      .listServers()
      .then(setMcpServers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / TASKS_PAGE_SIZE));

  const toggleExpanded = (task: Task) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) {
        next.delete(task.id);
        return next;
      }
      next.add(task.id);
      return next;
    });
    if (
      tokenTotals[task.id] === undefined &&
      !loadingTokenIds.has(task.id) &&
      task.lastChatId != null
    ) {
      setLoadingTokenIds((prev) => new Set(prev).add(task.id));
      void ipc.task
        .getTaskTokenTotal(task.id)
        .then((total) => {
          setTokenTotals((prev) => ({ ...prev, [task.id]: total }));
        })
        .catch(() => {})
        .finally(() => {
          setLoadingTokenIds((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        });
    }
  };

  const patch = (partial: Partial<TaskFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    const { preset, custom } = minutesToPreset(task.scheduleMinutes);
    setForm({
      title: task.title,
      prompt: task.prompt,
      preset,
      customMinutes: custom,
      projectId: task.projectId != null ? String(task.projectId) : "default",
      mcpServerIds: new Set(task.mcpServerIds ?? []),
      modelSelection: task.modelSelection
        ? JSON.stringify(task.modelSelection)
        : "default",
      enabled: task.enabled,
    });
    setDialogOpen(true);
  };

  const scheduleMinutes = (): number | null => {
    if (form.preset === "manual") return null;
    if (form.preset === "custom") {
      const n = Number(form.customMinutes);
      if (!Number.isInteger(n) || n <= 0) return null;
      return n;
    }
    return PRESET_MINUTES[form.preset];
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.prompt.trim()) {
      showError("Title and prompt are required");
      return;
    }
    const minutes = scheduleMinutes();
    if (form.preset === "custom" && minutes == null) {
      showError("Enter a valid number of minutes for the custom schedule");
      return;
    }
    const base = {
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      scheduleMinutes: minutes,
      projectId: form.projectId !== "default" ? Number(form.projectId) : null,
      mcpServerIds: form.mcpServerIds.size ? [...form.mcpServerIds] : null,
      modelSelection:
        form.modelSelection !== "default"
          ? JSON.parse(form.modelSelection)
          : null,
    };
    try {
      if (editingTask) {
        await ipc.task.updateTask({ taskId: editingTask.id, ...base });
        showSuccess("Task updated");
        setDialogOpen(false);
        await load();
      } else {
        await ipc.task.createTask(base);
        showSuccess("Task created");
        setDialogOpen(false);
        // New tasks sort to the top — jump to page 1 so it's visible.
        setPage(1);
        await load(1);
      }
    } catch (error) {
      showError(
        error instanceof Error
          ? `Failed to save task: ${error.message}`
          : "Failed to save task",
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await ipc.task.deleteTask(id);
      showSuccess("Task deleted");
      await load();
    } catch {
      showError("Failed to delete task");
    }
  };

  const handleRun = async (id: number) => {
    try {
      await ipc.task.runTaskNow(id);
      showSuccess("Task started");
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to run task");
    }
  };

  const handleToggleEnabled = async (task: Task, enabled: boolean) => {
    try {
      await ipc.task.updateTask({ taskId: task.id, enabled });
      await load();
    } catch {
      showError("Failed to update task");
    }
  };

  const openLatestRun = async (task: Task) => {
    if (task.lastChatId == null) return;
    navigate({ to: "/chat", search: { id: task.lastChatId } });
  };

  const taskProjectLabel = (task: Task): string | null => {
    if (task.projectId == null) return null;
    const app = apps.find((a) => a.id === task.projectId);
    return app ? app.name : `Project #${task.projectId}`;
  };

  const taskProjectKind = (task: Task): "code" | "codeless" | null => {
    if (task.projectId == null) return null;
    const app = apps.find((a) => a.id === task.projectId);
    return app ? (app.type === "chat" ? "codeless" : "code") : null;
  };

  const mcpNames = useMemo(() => {
    const byId = new Map(mcpServers.map((s) => [s.id, s.name]));
    return (ids: number[] | null) =>
      (ids ?? []).map((id) => byId.get(id) ?? `#${id}`);
  }, [mcpServers]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved prompts that run on a schedule or on demand, in a chat. Full
            control over schedule, target project, tools, and model.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          New task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <CalendarClock size={28} />
          <div>
            <p className="text-sm font-medium text-foreground">No tasks yet.</p>
            <p className="mt-1 text-xs">
              Create a task to run a prompt now, on a schedule, or both — in any
              code or codeless project.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex max-w-3xl flex-col gap-2">
          {tasks.map((task) => {
            const mcpNamesForTask = mcpNames(task.mcpServerIds);
            const isExpanded = expandedIds.has(task.id);
            const tokenTotal = tokenTotals[task.id];
            const tokensLoading = loadingTokenIds.has(task.id);
            return (
              <div
                key={task.id}
                className={`rounded-lg border ${task.enabled ? "" : "opacity-70"}`}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(task)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-muted/60"
                  >
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-muted-foreground transition-transform ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {task.title}
                        </span>
                        <Badge
                          variant={task.enabled ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {task.enabled ? "Scheduled" : "Paused"}
                        </Badge>
                        {taskProjectKind(task) === "code" && (
                          <Badge variant="outline" className="shrink-0">
                            Code
                          </Badge>
                        )}
                        {taskProjectKind(task) === "codeless" && (
                          <Badge variant="outline" className="shrink-0">
                            Codeless
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{formatSchedule(task.scheduleMinutes)}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(task.lastRunAt)}</span>
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Run now"
                      onClick={() => handleRun(task.id)}
                    >
                      <Play size={15} />
                    </Button>
                    {task.lastChatId != null && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open latest run"
                        onClick={() => openLatestRun(task)}
                      >
                        <ExternalLink size={15} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title={task.enabled ? "Pause" : "Resume"}
                      onClick={() => handleToggleEnabled(task, !task.enabled)}
                    >
                      <Power
                        size={15}
                        className={
                          task.enabled
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => openEdit(task)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-2 border-t px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {task.prompt}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Project:{" "}
                        <span className="font-medium text-foreground">
                          {taskProjectLabel(task) ?? "Default chat project"}
                        </span>
                      </span>
                      {mcpNamesForTask.length > 0 && (
                        <span>
                          Tools:{" "}
                          <span className="font-medium text-foreground">
                            {mcpNamesForTask.join(", ")}
                          </span>
                        </span>
                      )}
                      <span>
                        Tokens:{" "}
                        <span className="font-medium text-foreground">
                          {tokensLoading
                            ? "Loading…"
                            : (tokenTotal ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalCount > TASKS_PAGE_SIZE && (
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {totalCount} task{totalCount === 1 ? "" : "s"} · Page {page} of{" "}
                {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              Configure what runs, when, where, and with which tools.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="e.g. Weekly project summary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-prompt">Prompt</Label>
              <Textarea
                id="task-prompt"
                rows={3}
                value={form.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                placeholder="What should the agent do?"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Schedule</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_OPTIONS.map((opt) => {
                  const active = form.preset === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patch({ preset: opt.value })}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[11px] opacity-70">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
              {form.preset === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.customMinutes}
                    onChange={(e) => patch({ customMinutes: e.target.value })}
                    placeholder="N"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Target project</Label>
              <Select
                value={form.projectId}
                onValueChange={(value) => patch({ projectId: value ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default chat project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default chat project</SelectItem>
                  {codeProjects.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Code projects</SelectLabel>
                        {codeProjects.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                  {chatProjects.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Codeless projects</SelectLabel>
                        {chatProjects.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {isCodelessSelected && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={15} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        Workspace folder
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Read &amp; write Markdown docs here for context.
                      </div>
                    </div>
                  </div>
                </div>
                {selectedProject.directory ? (
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs">
                      {selectedProject.directory}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={directoryBusy}
                      onClick={clearDirectory}
                      title="Clear folder"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={directoryBusy}
                    onClick={chooseDirectory}
                    className="self-start"
                  >
                    {directoryBusy ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <FolderOpen size={14} className="mr-2" />
                    )}
                    Choose folder
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Model</Label>
              <Select
                value={form.modelSelection}
                onValueChange={(value) =>
                  patch({ modelSelection: value ?? "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default model</SelectItem>
                  {modelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mcpServers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Tools (MCP servers)</Label>
                <div className="flex flex-col gap-2 rounded-md border p-3">
                  {mcpServers.map((server) => (
                    <label
                      key={server.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={form.mcpServerIds.has(server.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(form.mcpServerIds);
                          if (checked) {
                            next.add(server.id);
                          } else {
                            next.delete(server.id);
                          }
                          patch({ mcpServerIds: next });
                        }}
                      />
                      <span>
                        {server.name}
                        {!server.enabled && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (disabled)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enabled</div>
                <div className="text-xs text-muted-foreground">
                  Recurring tasks only run while enabled. Manual tasks can still
                  be run on demand.
                </div>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => patch({ enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTask ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
