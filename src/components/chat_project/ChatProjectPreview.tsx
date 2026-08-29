import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  PenLine,
  RefreshCw,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { ipc } from "@/ipc/types";
import type { ChatProjectFileNode } from "@/ipc/types";
import { showError, showSuccess } from "@/lib/toast";
import { VanillaMarkdownParser } from "../chat/OctopusStudioMarkdownParser";
import { Button } from "@/components/ui/button";

interface ChatProjectPreviewProps {
  projectId: number | null;
  projectName?: string;
}

interface TreeNode {
  node: ChatProjectFileNode;
  children: TreeNode[];
}

/** Build a nested tree from the backend's flat, depth-first, dir-first list. */
function buildTree(nodes: ChatProjectFileNode[]): TreeNode[] {
  const byPath = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const node of nodes) {
    const treeNode: TreeNode = { node, children: [] };
    byPath.set(node.path, treeNode);
  }
  for (const node of nodes) {
    const treeNode = byPath.get(node.path)!;
    const parentPath = node.path.includes("/")
      ? node.path.slice(0, node.path.lastIndexOf("/"))
      : null;
    const parent = parentPath ? byPath.get(parentPath) : undefined;
    if (parent) {
      parent.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }
  return roots;
}

function TreeItem({
  treeNode,
  depth,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
}: {
  treeNode: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath: string | null;
  onSelect: (node: ChatProjectFileNode) => void;
}) {
  const { node, children } = treeNode;
  const isDir = node.type === "dir";
  const isExpanded = isDir && expanded.has(node.path);
  const Icon: LucideIcon = isDir
    ? isExpanded
      ? FolderOpen
      : Folder
    : FileText;

  return (
    <div>
      <button
        type="button"
        onClick={() => (isDir ? onToggle(node.path) : onSelect(node))}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] leading-5 transition-colors ${
          !isDir && selectedPath === node.path
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-foreground/90 hover:bg-sidebar-accent/60"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isDir ? (
          isExpanded ? (
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight
              size={14}
              className="shrink-0 text-muted-foreground"
            />
          )
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <Icon
          size={14}
          className={`shrink-0 ${
            isDir
              ? "text-muted-foreground"
              : node.isMarkdown
                ? "text-sky-600 dark:text-sky-400"
                : "text-muted-foreground"
          }`}
        />
        <span className="min-w-0 truncate">{node.name}</span>
        {!isDir && node.isMarkdown && (
          <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            md
          </span>
        )}
      </button>
      {isExpanded &&
        children.map((child) => (
          <TreeItem
            key={child.node.path}
            treeNode={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function ChatProjectPreview({
  projectId,
  projectName,
}: ChatProjectPreviewProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const filesQuery = useQuery({
    queryKey: ["chat-project-files", projectId],
    queryFn: () => ipc.chatProject.listFiles(projectId ?? 0),
    enabled: projectId != null,
  });

  const contentQuery = useQuery({
    queryKey: ["chat-project-file", projectId, selectedPath],
    queryFn: () =>
      ipc.chatProject.readFile({
        projectId: projectId ?? 0,
        path: selectedPath ?? "",
      }),
    enabled: projectId != null && selectedPath != null,
  });

  // Keep the editor draft in sync with the loaded file / selection.
  useEffect(() => {
    if (contentQuery.data) {
      setDraft(contentQuery.data.content);
    }
    setEditing(false);
  }, [contentQuery.data, selectedPath]);

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      ipc.chatProject.writeFile({
        projectId: projectId ?? 0,
        path: selectedPath ?? "",
        content,
      }),
    onSuccess: () => {
      showSuccess("File saved");
      void queryClient.invalidateQueries({
        queryKey: ["chat-project-files", projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["chat-project-file", projectId, selectedPath],
      });
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : "Failed to save file");
    },
  });

  const tree = useMemo(
    () => buildTree(filesQuery.data ?? []),
    [filesQuery.data],
  );

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const walk = (nodes: TreeNode[]): TreeNode[] => {
      const out: TreeNode[] = [];
      for (const n of nodes) {
        const matchingSelf = n.node.name.toLowerCase().includes(q);
        const matchingChildren = walk(n.children);
        if (matchingSelf || matchingChildren.length > 0) {
          out.push({
            node: n.node,
            children: matchingSelf ? n.children : matchingChildren,
          });
        }
      }
      return out;
    };
    return walk(tree);
  }, [tree, search]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (node: ChatProjectFileNode) => {
    if (saveMutation.isPending) return;
    setSelectedPath(node.path);
    setExpanded((prev) => {
      const next = new Set(prev);
      const parts = node.path.split("/");
      parts.pop();
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        next.add(acc);
      }
      return next;
    });
  };

  const handleCreateFile = () => {
    if (projectId == null) return;
    const name = window.prompt("New file name (relative to project root):");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSearch("");
    setSelectedPath(trimmed.replace(/^\/+/, ""));
    setDraft("");
    setEditing(true);
  };

  if (projectId == null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No project selected
      </div>
    );
  }

  const emptyVisible =
    !filesQuery.isLoading && (filesQuery.data?.length ?? 0) === 0;
  const selectedIsMarkdown = contentQuery.data?.isMarkdown ?? false;
  const dirty = editing && draft !== contentQuery.data?.content;

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {projectName ?? "Chat project"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Docs &amp; files
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="New file"
          onClick={handleCreateFile}
        >
          <FilePlus2 size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Refresh files"
          onClick={() => {
            if (saveMutation.isPending) return;
            setSelectedPath(null);
            setEditing(false);
            void filesQuery.refetch();
          }}
        >
          <RefreshCw size={14} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* File tree */}
        <div className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/20">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <Search size={13} className="shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {filesQuery.isLoading ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Loading…
              </div>
            ) : emptyVisible ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No files yet. Create a file or ask the assistant to write a
                document.
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No files match "{search}"
              </div>
            ) : (
              filteredTree.map((n) => (
                <TreeItem
                  key={n.node.path}
                  treeNode={n}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>

        {/* Content viewer */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Editor header */}
          {selectedPath != null && (
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {selectedPath}
              </span>
              {selectedIsMarkdown &&
                (editing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      if (dirty) {
                        if (!window.confirm("Discard unsaved changes?")) return;
                      }
                      setDraft(contentQuery.data?.content ?? "");
                      setEditing(false);
                    }}
                  >
                    <X size={13} />
                    Preview
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <PenLine size={13} />
                    Edit
                  </Button>
                ))}
              {editing && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={!dirty || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(draft)}
                >
                  <Check size={13} />
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedPath == null ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <FileText size={28} className="text-muted-foreground/50" />
                <p className="max-w-xs text-sm text-muted-foreground">
                  Select a file to preview it. Markdown files render as
                  documents and can be edited.
                </p>
              </div>
            ) : contentQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : contentQuery.isError ? (
              <div className="p-4 text-sm text-red-500">
                Couldn't open this file.
              </div>
            ) : selectedIsMarkdown && !editing ? (
              <article className="prose prose-sm dark:prose-invert max-w-none px-5 py-4">
                <VanillaMarkdownParser
                  content={contentQuery.data?.content ?? ""}
                />
              </article>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-5 text-foreground outline-none"
                autoFocus={editing && selectedIsMarkdown}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
