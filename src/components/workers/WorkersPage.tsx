import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Users,
  Calendar,
  Play,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  Download,
  Terminal,
  ArrowRight,
  Briefcase,
  AlertCircle,
  XCircle,
  ExternalLink,
  Square,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";
import { createModelSelection } from "@/lib/modelEffort";
import { ipc } from "@/ipc/types";
import { showError, showInfo, showSuccess } from "@/lib/toast";

type WorkerPersona = Awaited<ReturnType<typeof ipc.worker.listPersonas>>[number];
type WorkerRun = Awaited<ReturnType<typeof ipc.worker.listRuns>>[number];
type WorkerSchedule = Awaited<ReturnType<typeof ipc.worker.getSchedule>>;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTimestamp(date: Date | string): string {
  const d = new Date(date);
  return `${d.toLocaleTimeString()} ${d.toLocaleDateString()}`;
}

export function WorkersPage() {
  const navigate = useNavigate();
  const { apps } = useLoadApps();
  const { data: modelsByProviders } = useLanguageModelsByProviders();

  const [personas, setPersonas] = useState<WorkerPersona[]>([]);
  const [schedule, setSchedule] = useState<WorkerSchedule | null>(null);
  const [runs, setRuns] = useState<WorkerRun[]>([]);
  const [activeTab, setActiveTab] = useState("tasks");
  const [dispatching, setDispatching] = useState(false);

  // New Persona Form State
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaRole, setNewPersonaRole] = useState("");
  const [newPersonaDesc, setNewPersonaDesc] = useState("");
  const [newPersonaModel, setNewPersonaModel] = useState("default");
  const [newPersonaSystemPrompt, setNewPersonaSystemPrompt] = useState("");
  const [newPersonaCap, setNewPersonaCap] = useState("");

  // Task Input Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

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

  // All projects: code apps (type === "app", not the default chat bucket) + dedicated chat projects
  const codeProjects = useMemo(() => {
    return apps.filter((a) => a.type !== "chat" && !a.isDefaultChatProject);
  }, [apps]);

  const chatProjects = useMemo(() => {
    return apps.filter((a) => a.type === "chat" || a.isDefaultChatProject);
  }, [apps]);

  const allProjects = useMemo(
    () => [...codeProjects, ...chatProjects],
    [codeProjects, chatProjects],
  );

  const projectName = (id: number | null) =>
    id == null ? null : (apps.find((a) => a.id === id)?.name ?? `Project #${id}`);

  useEffect(() => {
    if (allProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(allProjects[0].id.toString());
    }
  }, [allProjects, selectedProjectId]);

  const loadPersonas = async () => {
    try {
      setPersonas(await ipc.worker.listPersonas());
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to load personas",
      );
    }
  };
  const loadSchedule = async () => {
    try {
      setSchedule(await ipc.worker.getSchedule());
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to load schedule",
      );
    }
  };
  const loadRuns = async () => {
    try {
      setRuns(await ipc.worker.listRuns());
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to load squad runs",
      );
    }
  };

  useEffect(() => {
    void loadPersonas();
    void loadSchedule();
    void loadRuns();
  }, []);

  // Poll while any run is still in flight so the progress bar and log feed
  // reflect the real backend as it works through each persona's turn.
  useEffect(() => {
    const hasActiveRun = runs.some((r) => r.status === "running");
    if (!hasActiveRun) return;
    const interval = setInterval(() => {
      void loadRuns();
    }, 2500);
    return () => clearInterval(interval);
  }, [runs]);

  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName || !newPersonaRole) {
      showError("Name and Role are required");
      return;
    }
    const capList = newPersonaCap
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    try {
      await ipc.worker.createPersona({
        name: newPersonaName,
        role: newPersonaRole,
        description: newPersonaDesc,
        systemPrompt:
          newPersonaSystemPrompt ||
          `You are a specialist working on ${newPersonaRole}.`,
        capabilities: capList.length > 0 ? capList : ["General Work"],
        modelSelection:
          newPersonaModel !== "default" ? JSON.parse(newPersonaModel) : null,
      });
      showSuccess(`${newPersonaName} has joined the team!`);
      setNewPersonaName("");
      setNewPersonaRole("");
      setNewPersonaDesc("");
      setNewPersonaModel("default");
      setNewPersonaSystemPrompt("");
      setNewPersonaCap("");
      await loadPersonas();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to add persona",
      );
    }
  };

  const handleRemovePersona = async (id: number) => {
    try {
      await ipc.worker.deletePersona(id);
      showSuccess("Persona removed");
      await loadPersonas();
    } catch {
      showError("Failed to remove persona");
    }
  };

  const handleToggleDay = async (day: number) => {
    if (!schedule) return;
    const activeDays = schedule.daysOfWeek.includes(day)
      ? schedule.daysOfWeek.filter((d) => d !== day)
      : [...schedule.daysOfWeek, day].sort();
    const updated = await ipc.worker.setSchedule({
      ...schedule,
      daysOfWeek: activeDays,
    });
    setSchedule(updated);
  };

  const patchSchedule = async (partial: Partial<WorkerSchedule>) => {
    if (!schedule) return;
    const updated = await ipc.worker.setSchedule({ ...schedule, ...partial });
    setSchedule(updated);
  };

  const handleStartTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) {
      showError("Please describe the task for the squad.");
      return;
    }
    const projId = parseInt(selectedProjectId, 10);
    if (!allProjects.some((p) => p.id === projId)) {
      showError("Please choose a valid project focus.");
      return;
    }
    if (personas.length === 0) {
      showError("Register at least one persona before dispatching a run.");
      return;
    }
    setDispatching(true);
    try {
      await ipc.worker.dispatchSquadRun({ projectId: projId, goal: taskTitle });
      setTaskTitle("");
      showInfo("Task assigned. Squad is processing...");
      await loadRuns();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to dispatch squad run",
      );
    } finally {
      setDispatching(false);
    }
  };

  const handleCancelRun = async (runId: number) => {
    try {
      await ipc.worker.cancelRun(runId);
      showInfo("Cancelling run...");
      await loadRuns();
    } catch {
      showError("Failed to cancel run");
    }
  };

  const handleDownloadReport = (run: WorkerRun) => {
    if (!run.report) return;
    const blob = new Blob([run.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Workers-Report-${run.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Markdown report downloaded successfully.");
  };

  const openRunChat = (run: WorkerRun) => {
    if (run.chatId == null) return;
    navigate({ to: "/chat", search: { id: run.chatId } });
  };

  // The log feed is derived straight from each step's real status/summary —
  // there's no separate simulated log stream to keep in sync.
  const runLogs = (run: WorkerRun): string[] => {
    const lines: string[] = [];
    for (const step of run.steps) {
      if (step.status === "pending") continue;
      if (step.status === "running") {
        lines.push(`🤖 [${step.personaName}] Working: "${step.instructions.split("\n").pop()}"`);
      } else if (step.status === "completed") {
        lines.push(`✅ [${step.personaName}] Done`);
        if (step.summary) lines.push(`  ↳ ${step.summary}`);
      } else if (step.status === "failed") {
        lines.push(`✖ [${step.personaName}] Failed`);
      }
    }
    if (run.status === "failed" && run.errorMessage) {
      lines.push(`✖ ${run.errorMessage}`);
    }
    if (run.status === "completed") {
      lines.push("✅ Squad run completed. Report generated.");
    }
    if (run.status === "cancelled") {
      lines.push("⏹ Run cancelled.");
    }
    return lines;
  };

  const scheduleActive = schedule?.isEnabled ?? false;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Automated Workers Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assemble persona squads, coordinate work schedule windows, and
              dispatch real turns — each persona's step runs through the same
              chat agent your normal conversations use.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={scheduleActive ? "default" : "secondary"} className="h-6">
              {scheduleActive ? "Supervised Company Active" : "Shift Hours Offline"}
            </Badge>
          </div>
        </div>

        {/* Core Layout Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="tasks" className="text-sm">
              Tasks & Reports
            </TabsTrigger>
            <TabsTrigger value="personas" className="text-sm">
              Team Personas
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="text-sm">
              Work Shift Scheduler
            </TabsTrigger>
          </TabsList>

          {/* TASKS & RUNS */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Task Dispatcher */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Assign Objective
                    </CardTitle>
                    <CardDescription>
                      Input a goal. The lead persona plans it, the rest of the
                      squad does real turns in a shared chat, and the last
                      persona writes the standup report.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleStartTask}>
                    <CardContent className="space-y-4">
                      {allProjects.length === 0 ? (
                        <div className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-500 border border-amber-500/20 flex gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            You need at least one project before executing
                            worker scripts.
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold">
                              Select Target Project Focus
                            </label>
                            <Select
                              value={selectedProjectId}
                              onValueChange={(val) => setSelectedProjectId(val || "")}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a project">
                                  {(value: unknown) =>
                                    typeof value === "string" && value
                                      ? (projectName(Number(value)) ?? "Choose a project")
                                      : "Choose a project"
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {codeProjects.length > 0 && (
                                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">
                                    Code Projects
                                  </div>
                                )}
                                {codeProjects.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                                {chatProjects.length > 0 && (
                                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold mt-1">
                                    Chat Projects
                                  </div>
                                )}
                                {chatProjects.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold">
                              Goal / Feature Scope
                            </label>
                            <Textarea
                              placeholder="e.g. Implement a dark mode switch element, update the storage sync, and write tests to prevent regression."
                              value={taskTitle}
                              onChange={(e) => setTaskTitle(e.target.value)}
                              rows={4}
                              className="text-sm"
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={allProjects.length === 0 || dispatching}
                      >
                        {dispatching ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Dispatch Squad Run
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </div>

              {/* Run logs / standup reports */}
              <div className="lg:col-span-2 space-y-6">
                {runs.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                    <Briefcase className="w-12 h-12 text-muted-foreground/45 mb-3" />
                    <h3 className="text-sm font-semibold">Ready for Assignments</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      No squad runs yet. Define a target project and submit an
                      objective to have the personas work it in a real chat.
                    </p>
                  </Card>
                ) : (
                  runs.map((run) => {
                    const progress =
                      run.totalSteps > 0
                        ? Math.round((run.currentStepIndex / run.totalSteps) * 100)
                        : 0;
                    return (
                      <Card key={run.id} className="border border-border">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant={
                                    run.status === "completed"
                                      ? "default"
                                      : run.status === "running"
                                        ? "outline"
                                        : run.status === "failed"
                                          ? "destructive"
                                          : "secondary"
                                  }
                                >
                                  {run.status.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(run.createdAt)}
                                </span>
                              </div>
                              <h3 className="font-semibold text-base mt-2 text-foreground">
                                {run.goal}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Isolated Project Context:{" "}
                                <span className="font-medium text-foreground underline">
                                  {projectName(run.projectId) ?? "Unknown project"}
                                </span>
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {run.chatId != null && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRunChat(run)}
                                  className="text-xs"
                                  title="Open the real chat this run is using"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open chat
                                </Button>
                              )}
                              {run.status === "running" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelRun(run.id)}
                                  className="text-xs"
                                >
                                  <Square className="w-3.5 h-3.5 mr-1" /> Cancel
                                </Button>
                              )}
                              {run.report && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReport(run)}
                                  className="text-xs"
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" /> Standup Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {run.status === "running" && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Sprint Execution Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-primary h-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                              Squad Steps
                            </label>
                            <div className="space-y-2">
                              {run.steps.map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-center justify-between p-2 rounded-md bg-muted/65 border border-muted text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {step.status === "completed" && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    )}
                                    {step.status === "running" && (
                                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                                    )}
                                    {step.status === "pending" && (
                                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                    )}
                                    {step.status === "failed" && (
                                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                                    )}
                                    <span
                                      className={
                                        step.status === "completed"
                                          ? "line-through text-muted-foreground truncate"
                                          : "font-medium text-foreground truncate"
                                      }
                                    >
                                      {step.summary ?? step.instructions.split("\n")[0]}
                                    </span>
                                  </div>
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    {step.personaName}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5" /> Workspace Logs Output
                            </label>
                            <div className="bg-zinc-950 font-mono text-[11px] text-zinc-300 p-3 rounded-md h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                              {runLogs(run).map((line, idx) => (
                                <div
                                  key={idx}
                                  className={
                                    line.startsWith("  ↳")
                                      ? "text-muted-foreground"
                                      : "text-zinc-100 font-semibold"
                                  }
                                >
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>

                          {run.report && (
                            <div className="bg-primary/5 rounded-md p-4 border border-primary/10 text-sm space-y-2 text-foreground">
                              <div className="font-semibold text-primary text-xs uppercase tracking-wider">
                                Shift Standup Summary
                              </div>
                              <div className="whitespace-pre-line text-xs font-mono text-muted-foreground">
                                {run.report}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* TEAM SQUAD PERSONAS */}
          <TabsContent value="personas" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Register Custom Persona</CardTitle>
                    <CardDescription>
                      Add custom worker agents with specialized system
                      instructions to help divide targets.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleAddPersona}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Worker Name</label>
                        <Input
                          placeholder="e.g. Jordan the Security Lead"
                          value={newPersonaName}
                          onChange={(e) => setNewPersonaName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Role Profile</label>
                        <Input
                          placeholder="e.g. Code Auditor"
                          value={newPersonaRole}
                          onChange={(e) => setNewPersonaRole(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Short Description</label>
                        <Input
                          placeholder="e.g. Audits packages for OWASP vulnerabilities"
                          value={newPersonaDesc}
                          onChange={(e) => setNewPersonaDesc(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Model</label>
                        <Select
                          value={newPersonaModel}
                          onValueChange={(val) => setNewPersonaModel(val || "default")}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default model">
                              {(value: unknown) =>
                                value === "default" || value == null
                                  ? "Default model"
                                  : (modelOptions.find((o) => o.value === value)?.label ??
                                    "Default model")
                              }
                            </SelectValue>
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

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">
                          System Instructions / Instruction Persona prompt
                        </label>
                        <Textarea
                          placeholder="Specify exact prompt directives..."
                          value={newPersonaSystemPrompt}
                          onChange={(e) => setNewPersonaSystemPrompt(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold">
                          Capabilities (comma separated)
                        </label>
                        <Input
                          placeholder="Security Audit, Dependency Inspect"
                          value={newPersonaCap}
                          onChange={(e) => setNewPersonaCap(e.target.value)}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Add Crew Member
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                  Squad Crew Roster ({personas.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personas.map((pers) => (
                    <Card key={pers.id} className="relative overflow-hidden group">
                      <CardHeader className="flex flex-row items-start justify-between pb-2 bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-1 bg-background rounded-md shadow-sm border border-border">
                            {pers.avatar}
                          </span>
                          <div>
                            <CardTitle className="text-sm font-bold text-foreground">
                              {pers.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {pers.role}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemovePersona(pers.id)}
                          title="Remove Persona"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-3 pb-4">
                        <p className="text-xs text-muted-foreground">
                          {pers.description}
                        </p>

                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                            Model Configuration
                          </span>
                          <span className="text-xs font-mono">
                            {pers.modelSelection
                              ? `${pers.modelSelection.provider}/${pers.modelSelection.name}`
                              : "App default"}{" "}
                            (Temp: {pers.temperature})
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                            Specialties & Capabilities
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {pers.capabilities.map((cap, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* WORK SCHEDULE SETTINGS */}
          <TabsContent value="scheduler" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5 text-primary" />
                  Scheduled Company Operation Bounds
                </CardTitle>
                <CardDescription>
                  Configure active intervals where personas process background
                  ticket allocations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {schedule && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          Background Company Automations
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enable or shut down automated company worker processing hours.
                        </p>
                      </div>
                      <Switch
                        checked={schedule.isEnabled}
                        onCheckedChange={(val) => patchSchedule({ isEnabled: val })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Operational Days
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Select the days of the week that the automation company operates.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {DAY_NAMES.map((dayName, idx) => {
                          const isSelected = schedule.daysOfWeek.includes(idx);
                          return (
                            <Button
                              key={idx}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="h-8 text-xs flex-1 min-w-[70px]"
                              onClick={() => handleToggleDay(idx)}
                            >
                              {dayName.substring(0, 3)}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Daily Shift Window
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Define active hours range. Outside this window, workers
                        are in standby mode.
                      </p>
                      <div className="flex gap-4 items-center pt-1">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs text-muted-foreground">
                            Shift Starts
                          </label>
                          <Input
                            type="time"
                            value={schedule.startHour}
                            onChange={(e) => patchSchedule({ startHour: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-6" />
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs text-muted-foreground">
                            Shift Concludes
                          </label>
                          <Input
                            type="time"
                            value={schedule.endHour}
                            onChange={(e) => patchSchedule({ endHour: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
