import {
  type LucideIcon,
  Home,
  Settings,
  HelpCircle,
  Store,
  BookOpen,
  Blocks,
  MessageSquare,
  Plus,
  ListTodo,
  Users,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

import { useSelectChat } from "@/hooks/useSelectChat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ipc } from "@/ipc/types";
import { showError } from "@/lib/toast";
import { ChatList } from "./ChatList";
import { ChatProjectList } from "./ChatProjectList";
import { WorkersList } from "./WorkersList";
import { EconomyModeSwitch } from "./EconomyModeSwitch";
import { AppList } from "./AppList";
import { ImportAppDialog } from "./ImportAppDialog";
import { HelpDialog } from "./HelpDialog";
import { helpDialogAtom } from "@/atoms/helpDialogAtom";
import { SettingsList } from "./SettingsList";
import { LibraryList } from "./LibraryList";
import { useLoadApps } from "@/hooks/useLoadApps";
import {
  type AppSidebarHoverState,
  type AppSidebarItemTitle,
  getSelectedSidebarPanel,
  isSidebarItemActive,
  shouldShowSelectedAppChatList,
} from "./app-sidebar-state";

// Menu items. "Chats" has no route of its own — it opens the default
// (projectless) project's chat list, so it's rendered as an action button.
const items = [
  {
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    title: "Chats",
    icon: MessageSquare,
  },
  {
    title: "Workers",
    to: "/workers",
    icon: Users,
  },
  {
    title: "Tasks",
    to: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Library",
    to: "/library",
    icon: BookOpen,
  },
  {
    title: "Templates",
    to: "/templates",
    icon: Store,
  },
  {
    title: "Plugins",
    to: "/plugins",
    icon: Blocks,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
] satisfies Array<{
  title: AppSidebarItemTitle;
  to?: string;
  icon: ComponentType<{ className?: string }>;
}>;

type AppSidebarItemTo = (typeof items)[number]["to"];

function AppSidebarRailButton({
  icon: Icon,
  label,
  isExpanded,
  isActive = false,
  to,
  onClick,
  onMouseEnter,
}: {
  icon: LucideIcon;
  label: string;
  isExpanded: boolean;
  isActive?: boolean;
  to?: AppSidebarItemTo;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const className = cn(
    "group/rail-button relative mb-1 flex h-10 items-center justify-center rounded-xl outline-none transition-[width,background-color] duration-200 ease-linear focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    isExpanded ? "w-14" : "w-10",
    isActive
      ? "bg-primary/15"
      : "hover:bg-sidebar-accent active:bg-sidebar-accent",
  );
  const content = (
    <>
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-200 ease-linear",
          isExpanded ? "top-[42%]" : "top-1/2",
        )}
      >
        <Icon className={cn("size-5", isActive && "text-primary")} />
      </span>
      <span
        className={cn(
          "pointer-events-none absolute bottom-0.5 left-1/2 max-w-[calc(100%-0.5rem)] -translate-x-1/2 truncate text-[10px] leading-3 transition-[opacity,transform] duration-200 ease-linear",
          isExpanded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          isActive ? "font-medium text-primary" : "text-sidebar-foreground/80",
        )}
      >
        {label}
      </span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        className={className}
        onMouseEnter={onMouseEnter}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {content}
    </button>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] =
    useState<AppSidebarHoverState>("no-hover");
  const expandedByHover = useRef(false);
  // Owned here (rather than inside AppList) and rendered outside the
  // panel-switching block below, so hovering over another sidebar icon while
  // this dialog is open — which unmounts AppList — can't silently discard an
  // in-progress import.
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const setHelpDialog = useSetAtom(helpDialogAtom);
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  const { apps } = useLoadApps();
  const defaultChatProjectId = useMemo(
    () => apps.find((app) => app.isDefaultChatProject)?.id ?? null,
    [apps],
  );

  useEffect(() => {
    if (hoverState.startsWith("start-hover") && state === "collapsed") {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);

  const routerState = useRouterState();
  const selectedItem = getSelectedSidebarPanel({
    hoverState,
    sidebarState: state,
    pathname: routerState.location.pathname,
    selectedAppId,
    defaultChatProjectId,
  });
  const showSelectedAppChats = shouldShowSelectedAppChatList({
    selectedPanel: selectedItem,
    selectedAppId,
    pathname: routerState.location.pathname,
  });

  // Override to show ChatProjectList if selectedItem is Chats but no chat is selected (shows the list of chat projects)
  // Wait, if showSelectedAppChats is true, we want to render the ChatList (list of messages/chats in that project).
  // If it's false, we want to render the ChatProjectList (list of chat projects, i.e., "Folders" of chats).
  const showChatProjectList = selectedItem === "Chats" && !showSelectedAppChats;

  // Removed handleViewAllApps to avoid unused warning since it is handled inline.

  const { selectChat } = useSelectChat();

  const handleNewChat = async () => {
    try {
      const { chatId, appId } = await ipc.chat.createChatInDefaultProject();
      selectChat({ chatId, appId });
    } catch (error) {
      showError(
        error instanceof Error
          ? `Failed to create a new chat: ${error.message}`
          : "Failed to create a new chat",
      );
    }
  };

  const handleOpenChats = () => {
    if (defaultChatProjectId != null) {
      setSelectedAppId(defaultChatProjectId);
      setSelectedChatId(null);
      navigate({ to: "/chat", search: { appId: defaultChatProjectId } });
    } else {
      // Default project is normally seeded at startup; fall back to creating one.
      handleNewChat();
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="shadow-lg"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
    >
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-[calc(var(--layout-title-bar-offset)+0.25rem)]">
          {/* Left Column: Icon rail */}
          <div
            className={`px-1 transition-[width] duration-200 ease-linear ${
              state === "expanded" ? "w-16" : "w-12"
            }`}
          >
            <SidebarTrigger
              className={cn(
                "transition-[width,background-color,color] duration-200 ease-linear focus-visible:ring-0",
                state === "expanded" ? "w-14" : "w-10",
              )}
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
            />
            <AppIcons
              onHoverChange={setHoverState}
              isExpanded={state === "expanded"}
              selectedAppId={selectedAppId}
              defaultChatProjectId={defaultChatProjectId}
              onOpenChats={handleOpenChats}
              onNewChat={handleNewChat}
            />
          </div>
          {/* Right Column: Contextual sub-list (only visible when expanded) */}
          <div className="relative h-[calc(100vh-112px)] w-[224px] overflow-hidden border-l border-sidebar-border">
            <AnimatePresence initial={false}>
              {selectedItem === "Apps" && !showSelectedAppChats && (
                <motion.div
                  key="apps"
                  className="absolute inset-0"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                >
                  <AppList
                    show
                    onImportClick={() => setIsImportDialogOpen(true)}
                  />
                </motion.div>
              )}
              {showSelectedAppChats && (
                <motion.div
                  key="chats"
                  className="absolute inset-0"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                >
                  <ChatList
                    show
                    showViewAllAppsButton
                    onViewAllApps={() => {
                      if (selectedItem === "Chats") {
                        // Navigate back to the chat project list view
                        if (defaultChatProjectId != null) {
                          setSelectedAppId(defaultChatProjectId);
                          setSelectedChatId(null);
                          navigate({
                            to: "/chat",
                            search: { appId: defaultChatProjectId },
                          });
                        } else {
                          setSelectedAppId(null);
                          setSelectedChatId(null);
                          navigate({
                            to: "/chat",
                            search: { appId: undefined },
                          });
                        }
                      } else {
                        // Navigate back to the apps list view
                        setSelectedAppId(null);
                        setSelectedChatId(null);
                        navigate({ to: "/", search: { appId: undefined } });
                      }
                    }}
                  />
                </motion.div>
              )}
              {showChatProjectList && (
                <motion.div
                  key="chat-projects"
                  className="absolute inset-0"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                >
                  <ChatProjectList show />
                </motion.div>
              )}
            </AnimatePresence>
            <WorkersList show={selectedItem === "Workers"} />
            <SettingsList show={selectedItem === "Settings"} />
            <LibraryList show={selectedItem === "Library"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="px-1 items-start">
        <SidebarMenu>
          <SidebarMenuItem>
            <EconomyModeSwitch isExpanded={state === "expanded"} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AppSidebarRailButton
              icon={HelpCircle}
              label="Help"
              isExpanded={state === "expanded"}
              onClick={() => setHelpDialog({ open: true })}
            />
            <HelpDialog />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <ImportAppDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
  isExpanded,
  selectedAppId,
  defaultChatProjectId,
  onOpenChats,
  onNewChat,
}: {
  onHoverChange: (state: AppSidebarHoverState) => void;
  isExpanded: boolean;
  selectedAppId: number | null;
  defaultChatProjectId: number | null;
  onOpenChats: () => void;
  onNewChat: () => void;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const hoverForTitle = (title: AppSidebarItemTitle): AppSidebarHoverState => {
    switch (title) {
      case "Apps":
        return "start-hover:app";
      case "Chats":
        return "start-hover:chats";
      case "Settings":
        return "start-hover:settings";
      case "Library":
        return "start-hover:library";
      case "Workers":
        return "start-hover:workers";
      default:
        // Items without a sub-list (Tasks, Templates, Plugins) dismiss any open
        // preview so a stale list doesn't linger while hovering an unrelated icon.
        return "clear-hover";
    }
  };

  return (
    <SidebarGroup className="p-0 py-2">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = isSidebarItemActive({
              title: item.title,
              pathname,
              selectedAppId,
              defaultChatProjectId,
            });
            const isChats = item.title === "Chats";

            return (
              <SidebarMenuItem key={item.title}>
                <AppSidebarRailButton
                  icon={item.icon}
                  label={item.title}
                  to={isChats ? undefined : item.to}
                  onClick={isChats ? onOpenChats : undefined}
                  isActive={isActive}
                  isExpanded={isExpanded}
                  onMouseEnter={() => onHoverChange(hoverForTitle(item.title))}
                />
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <div className="mx-2 my-2 h-px bg-sidebar-border" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AppSidebarRailButton
              icon={Plus}
              label="New chat"
              isExpanded={isExpanded}
              onClick={onNewChat}
              onMouseEnter={() => onHoverChange("clear-hover")}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
