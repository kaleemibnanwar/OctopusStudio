import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { Code2, FolderOpen, Loader2, MessageSquare } from "lucide-react";
import { ipc } from "@/ipc/types";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError } from "@/lib/toast";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useSelectChat } from "@/hooks/useSelectChat";

export type ProjectType = "code" | "chat";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ProjectType | null;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  defaultType,
}: NewProjectDialogProps) {
  const navigate = useNavigate();
  const { selectChat } = useSelectChat();

  const [type, setType] = useState<ProjectType | null>(null);
  const [name, setName] = useState("");
  const [directory, setDirectory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickingDirectory, setPickingDirectory] = useState(false);
  const { refreshApps } = useLoadApps();

  useEffect(() => {
    if (open) {
      if (defaultType === "code") {
        chooseProgramming();
        return;
      }
      setType(
        defaultType !== undefined && defaultType !== null ? defaultType : null,
      );
      setName("");
      setDirectory(null);
      setIsSubmitting(false);
    }
  }, [open, defaultType]);

  const chooseProgramming = () => {
    // Preserve the previous behavior for coding projects: go to the home screen.
    onOpenChange(false);
    navigate({ to: "/" });
    setTimeout(() => {
      const btn = document.getElementById("new-programming-project-btn");
      if (btn) {
        btn.click();
      } else {
        // Fallback: dispatch custom event
        window.dispatchEvent(new CustomEvent("open-new-project-dialog"));
      }
    }, 100);
  };

  const chooseDirectory = async () => {
    setPickingDirectory(true);
    try {
      const { path: picked, canceled } = await ipc.chatProject.pickDirectory();
      if (canceled || !picked) return;
      setDirectory(picked);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to choose directory",
      );
    } finally {
      setPickingDirectory(false);
    }
  };

  const createChatProject = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showError("Project name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const { appId } = await ipc.app.createChatProject({
        name: trimmed,
        directory,
      });
      const chatId = await ipc.chat.createChat({ appId });
      await refreshApps();
      onOpenChange(false);
      selectChat({ chatId, appId });
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Failed to create chat project",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showTypePicker = type !== "chat";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showTypePicker ? (
          <>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                What kind of project would you like to create?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <button
                type="button"
                onClick={chooseProgramming}
                className="flex items-start gap-3 rounded-md border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <Code2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Programming project</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Build an app or website with code and a live preview.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType("chat")}
                className="flex items-start gap-3 rounded-md border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <MessageSquare className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Chat project</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    A codeless workspace for notes, plans, and documents.
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New chat project</DialogTitle>
              <DialogDescription>
                Create a codeless workspace. Pick a folder for your documents,
                or leave it empty to use your octopus-studio-projects folder.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-project-name">Project name</Label>
                <Input
                  id="new-project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Research notes"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Workspace folder</Label>
                {directory ? (
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                      {directory}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => setDirectory(null)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      disabled={isSubmitting || pickingDirectory}
                      onClick={chooseDirectory}
                    >
                      {pickingDirectory ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <FolderOpen className="mr-2 size-4" />
                      )}
                      Choose folder
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Optional. If skipped, a folder will be created in your
                      octopus-studio-projects directory.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              {defaultType === undefined || defaultType === null ? (
                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setType(null)}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              <Button
                onClick={createChatProject}
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
