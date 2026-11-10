/**
 * Workspace root.
 *
 * Opens straight to the dashboard for the super admin — no sign-in step. All
 * content is local to the browser (see `store.ts`), which is why this can run
 * with no API and no database.
 */
import { useCallback, useEffect, useState } from "react";

import { Shell, type TopView } from "./Shell";
import { WorkspaceContext, useWorkspaceStore } from "./store";
import { ProjectPage, slugForTab, tabByLabel, type ProjectTabId } from "./project/ProjectPage";
import { EverythingView } from "./views/EverythingView";
import { HomeView } from "./views/HomeView";
import { LineupView } from "./views/LineupView";
import { MyWorkView } from "./views/MyWorkView";
import { PeopleView } from "./views/PeopleView";
import { ReportsView } from "./views/ReportsView";
import { SettingsView } from "./views/SettingsView";
import { ChatView } from "./views/ChatView";

interface Route {
  view: TopView;
  projectId: string | null;
  tab: ProjectTabId;
  /** `#/workspace/chat/<threadId>` — the open conversation, so it can be linked. */
  threadId?: string;
}

const TOP_VIEWS: TopView[] = [
  "home",
  "mywork",
  "everything",
  "lineup",
  "people",
  "reports",
  "finance",
  "chat",
  "settings",
];

/** `#/workspace/project/<id>/<tab>` — hash routing so links are shareable without a server. */
function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean); // e.g. ["workspace","project","<id>","todos"]

  if (parts[0] === "workspace" && parts[1] === "project" && parts[2]) {
    const tab = parts[3] ? tabByLabel(parts[3]) : undefined;
    return { view: "home", projectId: parts[2], tab: tab ?? "overview" };
  }
  if (parts[0] === "workspace" && parts[1] && TOP_VIEWS.includes(parts[1] as TopView)) {
    return { view: parts[1] as TopView, projectId: null, tab: "overview", threadId: parts[2] };
  }
  return { view: "home", projectId: null, tab: "overview" };
}

function buildHash(route: Route): string {
  if (route.projectId) {
    const tabSlug = route.tab === "overview" ? "" : `/${slugForTab(route.tab)}`;
    return `#/workspace/project/${route.projectId}${tabSlug}`;
  }
  if (route.view === "chat" && route.threadId) return `#/workspace/chat/${route.threadId}`;
  return `#/workspace/${route.view}`;
}

export default function Workspace() {
  const store = useWorkspaceStore();
  const [route, setRoute] = useState<Route>(parseHash);

  // Keep the hash and the state in step, in both directions.
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateState = useCallback((next: Route) => {
    setRoute(next);
    window.history.replaceState(null, "", buildHash(next));
  }, []);

  const navigate = useCallback((view: TopView) => navigateState({ view, projectId: null, tab: "overview" }), [navigateState]);

  const openProject = useCallback(
    (projectId: string, tab?: string) =>
      navigateState({
        view: "home",
        projectId,
        tab: (tab && tabByLabel(tab)) || "overview",
      }),
    [navigateState],
  );

  useEffect(() => {
    document.title = "Workspace | Jojuni Technologies";
    // A manifest is optional here; only register it if one exists.
    return () => {
      document.title = "Jojuni Technologies";
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={store}>
      <Shell
        state={store.state}
        view={route.projectId ? "home" : route.view}
        activeProjectId={route.projectId}
        onNavigate={navigate}
        onOpenProject={openProject}
      >
        {route.projectId ? (
          <ProjectPage
            projectId={route.projectId}
            tab={route.tab}
            onTab={(tab) => navigateState({ ...route, tab })}
            onBack={() => navigate("home")}
          />
        ) : route.view === "home" ? (
          <HomeView onOpenProject={openProject} onNavigate={navigate} />
        ) : route.view === "mywork" ? (
          <MyWorkView onOpenProject={openProject} />
        ) : route.view === "everything" ? (
          <EverythingView onOpenProject={openProject} />
        ) : route.view === "lineup" ? (
          <LineupView onOpenProject={openProject} />
        ) : route.view === "people" ? (
          <PeopleView onOpenProject={openProject} />
        ) : route.view === "reports" || route.view === "finance" ? (
          <ReportsView onOpenProject={openProject} />
        ) : route.view === "chat" ? (
          <ChatView threadId={route.threadId} onOpenThread={(threadId) => navigateState({ ...route, threadId })} />
        ) : (
          <SettingsView onOpenProject={openProject} />
        )}
      </Shell>
    </WorkspaceContext.Provider>
  );
}
