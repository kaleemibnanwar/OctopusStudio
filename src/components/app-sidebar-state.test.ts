import { describe, expect, it } from "vitest";
import {
  getRouteSidebarPanel,
  getSelectedSidebarPanel,
  isSidebarItemActive,
  shouldShowSelectedAppChatList,
} from "@/components/app-sidebar-state";

const APPS_CTX = { selectedAppId: 1, defaultChatProjectId: 99 };
const CHATS_CTX = { selectedAppId: 99, defaultChatProjectId: 99 };

describe("app sidebar state", () => {
  it("folds non-default chat routes into the Apps panel", () => {
    expect(getRouteSidebarPanel("/chat", APPS_CTX)).toBe("Apps");
    expect(
      isSidebarItemActive({ title: "Apps", pathname: "/chat", ...APPS_CTX }),
    ).toBe(true);
  });

  it("routes default-project chats into the Chats panel", () => {
    expect(getRouteSidebarPanel("/chat", CHATS_CTX)).toBe("Chats");
    expect(
      isSidebarItemActive({ title: "Chats", pathname: "/chat", ...CHATS_CTX }),
    ).toBe(true);
    expect(
      isSidebarItemActive({ title: "Apps", pathname: "/chat", ...CHATS_CTX }),
    ).toBe(false);
  });

  it("selects Apps for app routes when the sidebar is expanded", () => {
    expect(
      getSelectedSidebarPanel({
        hoverState: "no-hover",
        sidebarState: "expanded",
        pathname: "/app-details",
        ...APPS_CTX,
      }),
    ).toBe("Apps");
    expect(
      getSelectedSidebarPanel({
        hoverState: "no-hover",
        sidebarState: "expanded",
        pathname: "/apps",
        ...APPS_CTX,
      }),
    ).toBe("Apps");
  });

  it("selects the Chats panel when hovering the Chats icon", () => {
    expect(
      getSelectedSidebarPanel({
        hoverState: "start-hover:chats",
        sidebarState: "collapsed",
        pathname: "/",
        ...APPS_CTX,
      }),
    ).toBe("Chats");
  });

  it("shows the selected app chat list only inside Apps with an app selected", () => {
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Apps",
        selectedAppId: 1,
        pathname: "/app-details",
      }),
    ).toBe(true);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Apps",
        selectedAppId: null,
        pathname: "/app-details",
      }),
    ).toBe(false);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Settings",
        selectedAppId: 1,
        pathname: "/app-details",
      }),
    ).toBe(false);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Chats",
        selectedAppId: 1,
        pathname: "/app-details",
      }),
    ).toBe(false);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Apps",
        selectedAppId: 1,
        pathname: "/",
      }),
    ).toBe(false);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Apps",
        selectedAppId: 1,
        pathname: "/apps",
      }),
    ).toBe(false);
    expect(
      shouldShowSelectedAppChatList({
        selectedPanel: "Apps",
        selectedAppId: 1,
        pathname: "/chat",
      }),
    ).toBe(true);
  });
});
