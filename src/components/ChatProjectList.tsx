import React, { useState, useMemo } from "react";
import {
  Plus,
  Download,
  MessageSquare,
  Star,
  Folder,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { useLoadApps } from "@/hooks/useLoadApps";
import { NewProjectDialog } from "./NewProjectDialog";
import { ImportProjectDialog } from "./ImportProjectDialog";
import { useAtom, useSetAtom } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface ChatProjectListProps {
  show?: boolean;
}

export function ChatProjectList({ show = true }: ChatProjectListProps) {
  const navigate = useNavigate();
  const { apps, loading } = useLoadApps();
  const [selectedAppId, setSelectedAppId] = useAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Filter for chat-type projects AND the default chat project (which is type "app" but is the general chats bucket)
  const chatProjects = useMemo(() => {
    return apps.filter(
      (app) => app.type === "chat" || app.isDefaultChatProject,
    );
  }, [apps]);

  const handleProjectClick = (projectId: number) => {
    setSelectedAppId(projectId);
    setSelectedChatId(null);
    navigate({ to: "/chat", search: { appId: projectId } });
  };

  if (!show) return null;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Sidebar Sub-header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider uppercase opacity-75">
          Chat Projects
        </h2>
        <div className="flex items-center gap-1">
          {/* New Chat Project */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setIsNewDialogOpen(true)}
            title="New Chat Project"
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Import Chat Project */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setIsImportDialogOpen(true)}
            title="Import Chat Project"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading projects...
          </div>
        ) : chatProjects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground/60 space-y-2">
            <div>No chat projects yet.</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewDialogOpen(true)}
              className="w-full text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Start Chat Project
            </Button>
          </div>
        ) : (
          chatProjects.map((proj) => {
            const isActive = selectedAppId === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => handleProjectClick(proj.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground",
                )}
              >
                {proj.isDefaultChatProject ? (
                  <MessageSquare className="w-4 h-4 shrink-0 text-amber-500" />
                ) : (
                  <Folder className="w-4 h-4 shrink-0 opacity-70" />
                )}
                <span className="truncate flex-1">{proj.name}</span>
                {proj.isFavorite && (
                  <Star className="w-3.5 h-3.5 shrink-0 text-amber-400 fill-amber-400" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <NewProjectDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        defaultType="chat"
      />
      <ImportProjectDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        defaultType="chat"
      />
    </div>
  );
}
