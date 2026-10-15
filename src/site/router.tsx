import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * A ~40 line history router: enough for real pages with shareable URLs,
 * without pulling in a routing dependency.
 */

type RouterValue = { path: string; navigate: (to: string) => void };

const RouterContext = createContext<RouterValue>({ path: "/", navigate: () => undefined });

const normalize = (value: string) => value.replace(/\/+$/, "") || "/";

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => normalize(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalize(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (to: string) => {
    const next = normalize(to);
    if (next === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0 });
  };

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  return useContext(RouterContext);
}

interface SiteLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

/** Anchor that swaps pages client-side; middle/cmd-click still opens a tab. */
export function SiteLink({ to, onClick, children, ...rest }: SiteLinkProps) {
  const { navigate } = useRouter();
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
    onClick?.(event);
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
