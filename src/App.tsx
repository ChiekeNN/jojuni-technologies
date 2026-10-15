import PublicSite from "./PublicSite";
import WorkspaceApp from "./WorkspaceApp";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/workspace" || path.startsWith("/workspace/")) {
    return <WorkspaceApp />;
  }

  return <PublicSite />;
}
