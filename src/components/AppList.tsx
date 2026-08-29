import { useNavigate } from "@tanstack/react-router";
import { Folder, PlusCircle, Search, Star, Upload } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useOpenApp } from "@/hooks/useOpenApp";
import { useAppCollections } from "@/hooks/useAppCollections";
import { useSettings } from "@/hooks/useSettings";
import { useMemo, useState } from "react";
import { AppSearchDialog } from "./AppSearchDialog";
import { AppItem } from "./appItem";

export function AppList({
  show,
  onImportClick,
}: {
  show?: boolean;
  // The Import dialog is rendered by the parent sidebar, outside the
  // conditional block that mounts AppList, so it isn't torn down (along with
  // any in-progress import) by the hover-driven panel switch — see
  // app-sidebar.tsx for where onImportClick opens it.
  onImportClick: () => void;
}) {
  const navigate = useNavigate();
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  const openApp = useOpenApp();
  const { apps, loading, error } = useLoadApps();
  const { collections } = useAppCollections();
  const { settings } = useSettings();
  const enableMultiWindow = !!settings?.enableMultiWindow;
  // search dialog state
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  const allApps = useMemo(
    () =>
      apps
        .filter((a) => a.type !== "chat" && !a.isDefaultChatProject)
        .map((a) => ({
          id: a.id,
          name: a.name,
          createdAt: a.createdAt,
          matchedChatTitle: null,
          matchedChatMessage: null,
        })),
    [apps],
  );

  const favoriteApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          app.isFavorite && app.type !== "chat" && !app.isDefaultChatProject,
      ),
    [apps],
  );

  const visibleCollectionIds = useMemo(
    () => new Set(collections.map((c) => c.id)),
    [collections],
  );

  const nonFavoriteApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          app.type !== "chat" &&
          !app.isDefaultChatProject &&
          !app.isFavorite &&
          (app.collectionId == null ||
            !visibleCollectionIds.has(app.collectionId)),
      ),
    [apps, visibleCollectionIds],
  );

  const collectionMembers = useMemo(() => {
    const byId = new Map<number, typeof apps>();
    for (const app of apps) {
      if (app.collectionId == null) continue;
      if (!visibleCollectionIds.has(app.collectionId)) continue;
      const list = byId.get(app.collectionId) ?? [];
      list.push(app);
      byId.set(app.collectionId, list);
    }
    return byId;
  }, [apps, visibleCollectionIds]);

  const handleAppClick = (id: number) => {
    setIsSearchDialogOpen(false);
    openApp(id);
  };

  if (!show) {
    return null;
  }

  return (
    <>
      <SidebarGroup
        className="overflow-y-auto h-[calc(100vh-112px)]"
        data-testid="app-list-container"
      >
        <SidebarGroupContent>
          <div className="flex flex-col space-y-3">
            <div className="mx-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  // Direct to Home page to start programming app/project
                  navigate({ to: "/" });
                }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1 flex items-center justify-start gap-1 py-2 px-2.5 text-xs h-8",
                )}
                title="New Programming Project"
              >
                <PlusCircle size={14} />
                <span className="truncate">New</span>
              </button>
              <button
                type="button"
                onClick={onImportClick}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1 flex items-center justify-start gap-1 py-2 px-2.5 text-xs h-8",
                )}
                title="Import Programming Project"
              >
                <Upload size={14} className="shrink-0" />
                <span className="truncate">Import</span>
              </button>
              <Button
                onClick={() => setIsSearchDialogOpen(!isSearchDialogOpen)}
                variant="outline"
                size="sm"
                className="shrink-0 flex items-center justify-center p-2 h-8 w-8 text-xs"
                title="Search Apps"
                aria-label="Search Apps"
                data-testid="search-apps-button"
              >
                <Search size={14} />
              </Button>
            </div>

            {loading ? (
              <div className="py-2 px-4 text-sm text-gray-500">
                Loading apps...
              </div>
            ) : error ? (
              <div className="py-2 px-4 text-sm text-red-500">
                Error loading apps
              </div>
            ) : favoriteApps.length === 0 &&
              nonFavoriteApps.length === 0 &&
              collectionMembers.size === 0 ? (
              <div className="py-2 px-4 text-sm text-gray-500">
                No apps found
              </div>
            ) : (
              <SidebarMenu className="space-y-1" data-testid="app-list">
                <div className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                  Favorite apps
                </div>
                {favoriteApps.length === 0 ? (
                  <div className="mx-2 mb-2 flex items-center gap-2 rounded-md border border-dashed border-sidebar-border px-3 py-3 text-xs text-muted-foreground">
                    <Star size={14} className="shrink-0" />
                    <span>Star an app to pin it here</span>
                  </div>
                ) : (
                  favoriteApps.map((app) => (
                    <AppItem
                      key={app.id}
                      app={app}
                      handleAppClick={handleAppClick}
                      selectedAppId={selectedAppId}
                      enableMultiWindow={enableMultiWindow}
                    />
                  ))
                )}
                {collections.length > 0 && (
                  <div
                    data-testid="sidebar-collections-section"
                    className="mt-2"
                  >
                    <div className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                      Collections
                    </div>
                    <Accordion multiple className="px-1">
                      {collections.map((collection) => {
                        const members =
                          collectionMembers.get(collection.id) ?? [];
                        return (
                          <AccordionItem
                            key={collection.id}
                            value={`collection-${collection.id}`}
                            className="border-b-0"
                            data-testid={`sidebar-collection-${collection.id}`}
                          >
                            <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-sidebar-accent/60 rounded-md">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <Folder
                                  size={14}
                                  className="shrink-0 text-muted-foreground"
                                />
                                <span className="truncate text-sm">
                                  {collection.name}
                                </span>
                                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                                  {members.length}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-1 pl-3">
                              {members.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                  Empty
                                </div>
                              ) : (
                                members.map((app) => (
                                  <AppItem
                                    key={app.id}
                                    app={app}
                                    handleAppClick={handleAppClick}
                                    selectedAppId={selectedAppId}
                                    enableMultiWindow={enableMultiWindow}
                                  />
                                ))
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}
                <div className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                  Other apps
                </div>
                {nonFavoriteApps.map((app) => (
                  <AppItem
                    key={app.id}
                    app={app}
                    handleAppClick={handleAppClick}
                    selectedAppId={selectedAppId}
                    enableMultiWindow={enableMultiWindow}
                  />
                ))}
              </SidebarMenu>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
      <AppSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        onSelectApp={handleAppClick}
        allApps={allApps}
      />
    </>
  );
}
