import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import "./index.css";

const SESSION_TOKEN_KEY = "app_session_token";
// TEMPORARY: Password Gate — token key for gate authentication
const GATE_TOKEN_KEY = "olfactra_gate_token";
// END TEMPORARY: Password Gate

// Capture session token from URL (set by OAuth callback for browsers blocking third-party cookies)
function captureSessionToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("__session_token");
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    // Clean the URL by removing the token parameter
    url.searchParams.delete("__session_token");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }
}

captureSessionToken();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // TEMPORARY: Password Gate — if gate token exists, clear it and reload to show password screen.
  // NEVER redirect to Manus OAuth when a gate token is present.
  const gateToken = localStorage.getItem(GATE_TOKEN_KEY);
  if (gateToken) {
    // Gate token may have expired; clear it and reload to show password screen
    localStorage.removeItem(GATE_TOKEN_KEY);
    window.location.reload();
    return;
  }
  // END TEMPORARY: Password Gate

  // Clear stored token on auth failure
  localStorage.removeItem(SESSION_TOKEN_KEY);
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers((init as any)?.headers);
        // TEMPORARY: Password Gate — prefer gate token over session token
        const gateToken = localStorage.getItem(GATE_TOKEN_KEY);
        if (gateToken) {
          headers.set("Authorization", `Bearer ${gateToken}`);
        } else {
          // END TEMPORARY: Password Gate
          // Add Authorization header from localStorage as fallback for blocked cookies
          const token = localStorage.getItem(SESSION_TOKEN_KEY);
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }
        // TEMPORARY: Password Gate — closing brace for else
        }
        // END TEMPORARY: Password Gate
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
