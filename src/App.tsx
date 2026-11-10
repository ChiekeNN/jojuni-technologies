import { useCallback, useEffect, useState } from "react";

import PublicSite from "./PublicSite";
import WorkspaceApp from "./WorkspaceApp";
import WorkspaceLogin from "./WorkspaceLogin";
import { api } from "./lib/api";
import { RouterProvider } from "./site/router";

type AuthPhase = "checking" | "anonymous" | "authenticated";

/**
 * `/workspace` is super-admin only.
 *
 * The gate here is a convenience: it keeps the workspace UI from mounting for
 * someone without a session. The real enforcement is server-side — every
 * `/api/workspace*` route calls `requireWorkspaceSession`, so an unauthenticated
 * visitor who forces the UI open gets empty screens and 401s, never company data.
 */
function WorkspaceGate() {
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [expired, setExpired] = useState(false);

  const check = useCallback(async (markExpired: boolean) => {
    try {
      const state = await api.workspaceAuth.check();
      setPhase(state.authenticated ? "authenticated" : "anonymous");
      if (!state.authenticated && markExpired) setExpired(true);
    } catch {
      // A network failure must not lock the owner out of the sign-in screen.
      setPhase("anonymous");
    }
  }, []);

  useEffect(() => {
    void check(false);
  }, [check]);

  const handleSignedIn = useCallback(() => {
    setExpired(false);
    setPhase("authenticated");
  }, []);

  const handleSignedOut = useCallback(() => {
    setExpired(false);
    setPhase("anonymous");
  }, []);

  if (phase === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-white">
        <div className="flex items-center gap-3 text-sm text-white/45">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#d90429]" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (phase === "anonymous") {
    return <WorkspaceLogin onSignedIn={handleSignedIn} expired={expired} />;
  }

  return <WorkspaceApp onSignOut={handleSignedOut} onSessionExpired={() => void check(true)} />;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/workspace" || path.startsWith("/workspace/")) {
    return <WorkspaceGate />;
  }

  return (
    <RouterProvider>
      <PublicSite />
    </RouterProvider>
  );
}
