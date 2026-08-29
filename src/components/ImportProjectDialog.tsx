import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { Code2, Folder, Loader2, MessageSquare, X } from "lucide-react";
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
import { ImportAppDialog } from "./ImportAppDialog";
import { useLoadApps } from "@/hooks/useLoadApps";

import { useSelectChat } from "@/hooks/useSelectChat";

type ImportType = "code" | "chat";

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ImportType | null;
}

export function ImportProjectDialog({
  open,
  onOpenChange,
  defaultType,
}: ImportProjectDialogProps) {
  const { selectChat } = useSelectChat();

  const [type, setType] = useState<ImportType | null>(null);
  const [showImportApp, setShowImportApp] = useState(false);
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
    onOpenChange(false);
    setShowImportApp(true);
    // If it's a code import, we go straight to showImportApp
  };

  const closeImportApp = () => setShowImportApp(false);

  const chooseDirectory = async () => {
    setPickingDirectory(true);
    try {
      const { path: picked, canceled } = await ipc.chatProject.pickDirectory();
      if (canceled || !picked) return;
      setDirectory(picked);
      // Default the project name to the selected folder's name.
      if (!name.trim()) {
        const base =
          picked
            .replace(/[\\/]+$/, "")
            .split(/[\\/]/)
            .pop() ?? "";
        setName(base);
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to choose directory",
      );
    } finally {
      setPickingDirectory(false);
    }
  };

  const createChatProject = async () => {
    if (!directory) {
      showError("Choose a folder to import");
      return;
    }
    const trimmed =
      name.trim() ||
      directory
        .replace(/[\\/]+$/, "")
        .split(/[\\/]/)
        .pop()!;
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {showTypePicker ? (
            <>
              <DialogHeader>
                <DialogTitle>Import project</DialogTitle>
                <DialogDescription>
                  What kind of project are you importing?
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
                    <div className="text-sm font-medium">
                      Programming project
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Import a local folder or a GitHub repository.
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
                      Link an existing folder as a codeless workspace.
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Import chat project</DialogTitle>
                <DialogDescription>
                  Choose a folder to use as this codeless project's workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                {!directory ? (
                  <Button
                    variant="outline"
                    className="self-start"
                    disabled={isSubmitting || pickingDirectory}
                    onClick={chooseDirectory}
                  >
                    {pickingDirectory ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Folder className="mr-2 size-4" />
                    )}
                    {pickingDirectory ? "Selecting…" : "Choose folder"}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-medium mb-1">Folder</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {directory}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={isSubmitting}
                        onClick={() => setDirectory(null)}
                        aria-label="Clear folder"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="import-chat-name">Project name</Label>
                      <Input
                        id="import-chat-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
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
                  disabled={isSubmitting || !directory}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  {isSubmitting ? "Importing…" : "Import project"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImportAppDialog isOpen={showImportApp} onClose={closeImportApp} />
    </>
  );
}
