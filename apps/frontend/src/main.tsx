import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { API_URL } from "@/lib/api";
import { getLogger } from "@/lib/logger";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

// `context` is handed to every route's loader and beforeLoad. Passing the
// queryClient here is what makes `context.queryClient.ensureQueryData(...)`
// available in route loaders.
const router = createRouter({
  routeTree,
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Which backend this build talks to is the first thing you want to know when the
// app is pointed at the wrong environment.
getLogger()
  .withMetadata({ apiUrl: API_URL, mode: import.meta.env.MODE })
  .info("Starting frontend");

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
