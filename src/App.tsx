import PublicSite from "./PublicSite";
import Workspace from "./workspace/Workspace";
import { RouterProvider } from "./site/router";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/workspace" || path.startsWith("/workspace/")) {
    // The workspace opens straight to the dashboard: the super admin asked for
    // full access without a password while the tool is being built out. It is
    // local-first (browser storage only), so there is no company data behind it
    // yet — see src/workspace/store.ts.
    return <Workspace />;
  }

  return (
    <RouterProvider>
      <PublicSite />
    </RouterProvider>
  );
}
