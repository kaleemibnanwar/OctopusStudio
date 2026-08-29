export type AppSidebarHoverState =
  | "start-hover:app"
  | "start-hover:chats"
  | "start-hover:settings"
  | "start-hover:library"
  | "start-hover:workers"
  | "clear-hover"
  | "no-hover";

export type AppSidebarPanel =
  | "Apps"
  | "Chats"
  | "Settings"
  | "Library"
  | "Workers";

export type AppSidebarItemTitle =
  | AppSidebarPanel
  | "Templates"
  | "Plugins"
  | "Tasks"
  | "Workers";

export function getRouteSidebarPanel(
  pathname: string,
  ctx?: {
    selectedAppId: number | null;
    defaultChatProjectId: number | null;
    selectedAppType?: "app" | "chat" | null;
  },
): AppSidebarPanel | null {
  if (pathname === "/workers" || pathname.startsWith("/workers")) {
    return "Workers";
  }

  if (pathname === "/chat" || pathname.startsWith("/chat")) {
    if (
      ctx?.selectedAppType === "chat" ||
      (ctx?.selectedAppId != null &&
        ctx.selectedAppId === ctx.defaultChatProjectId)
    ) {
      return "Chats";
    }
    return "Apps";
  }

  if (pathname.startsWith("/workers")) {
    return "Workers";
  }

  if (
    pathname === "/" ||
    pathname.startsWith("/apps") ||
    pathname.startsWith("/app-details")
  ) {
    return "Apps";
  }

  if (pathname.startsWith("/settings")) {
    return "Settings";
  }

  if (pathname.startsWith("/library")) {
    return "Library";
  }

  return null;
}

export function getHoverSidebarPanel(
  hoverState: AppSidebarHoverState,
): AppSidebarPanel | null {
  if (hoverState === "start-hover:app") {
    return "Apps";
  }
  if (hoverState === "start-hover:chats") {
    return "Chats";
  }
  if (hoverState === "start-hover:settings") {
    return "Settings";
  }
  if (hoverState === "start-hover:library") {
    return "Library";
  }
  if (hoverState === "start-hover:workers") {
    return "Workers";
  }
  return null;
}

export function getSelectedSidebarPanel({
  hoverState,
  sidebarState,
  pathname,
  selectedAppId,
  defaultChatProjectId,
  selectedAppType,
}: {
  hoverState: AppSidebarHoverState;
  sidebarState: "expanded" | "collapsed";
  pathname: string;
  selectedAppId: number | null;
  defaultChatProjectId: number | null;
  selectedAppType?: "app" | "chat" | null;
}): AppSidebarPanel | null {
  const hoverPanel = getHoverSidebarPanel(hoverState);
  if (hoverPanel) {
    return hoverPanel;
  }

  if (sidebarState === "expanded") {
    return getRouteSidebarPanel(pathname, {
      selectedAppId,
      defaultChatProjectId,
      selectedAppType: selectedAppType ?? null,
    });
  }

  return null;
}

export function isSidebarItemActive({
  title,
  pathname,
  selectedAppId,
  defaultChatProjectId,
  selectedAppType,
}: {
  title: AppSidebarItemTitle;
  pathname: string;
  selectedAppId?: number | null;
  defaultChatProjectId?: number | null;
  selectedAppType?: "app" | "chat" | null;
}) {
  if (title === "Apps") {
    return (
      getRouteSidebarPanel(pathname, {
        selectedAppId: selectedAppId ?? null,
        defaultChatProjectId: defaultChatProjectId ?? null,
        selectedAppType: selectedAppType ?? null,
      }) === "Apps"
    );
  }
  if (title === "Chats") {
    return (
      getRouteSidebarPanel(pathname, {
        selectedAppId: selectedAppId ?? null,
        defaultChatProjectId: defaultChatProjectId ?? null,
        selectedAppType: selectedAppType ?? null,
      }) === "Chats"
    );
  }
  if (title === "Workers") {
    return pathname.startsWith("/workers");
  }
  if (title === "Settings") {
    return pathname.startsWith("/settings");
  }
  if (title === "Library") {
    return pathname.startsWith("/library");
  }
  if (title === "Templates") {
    return pathname.startsWith("/templates");
  }
  if (title === "Tasks") {
    return pathname.startsWith("/tasks");
  }
  return pathname.startsWith("/plugins");
}

export function shouldShowSelectedAppChatList({
  selectedPanel,
  selectedAppId,
  pathname,
  defaultChatProjectId,
}: {
  selectedPanel: AppSidebarPanel | null;
  selectedAppId: number | null;
  pathname: string;
  defaultChatProjectId?: number | null;
}) {
  // If the selected panel is Apps, show chat list for that app when navigating to /chat or /app-details
  if (selectedPanel === "Apps" && selectedAppId !== null) {
    return pathname.startsWith("/app-details") || pathname === "/chat";
  }
  // For Chats panel: only show the individual chat list when a *specific* (non-default)
  // chat project has been explicitly selected. If only the default project is active,
  // show the ChatProjectList instead so users can pick a project.
  if (
    selectedPanel === "Chats" &&
    selectedAppId !== null &&
    pathname === "/chat"
  ) {
    // If the selected app is NOT the default chat project, a real project was chosen → show ChatList
    if (
      defaultChatProjectId != null &&
      selectedAppId !== defaultChatProjectId
    ) {
      return true;
    }
    // If selectedAppId IS the default project, show the project list so the user picks a project
    return false;
  }
  return false;
}
