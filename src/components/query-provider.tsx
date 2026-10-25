"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 45 * 1000, // 45 seconds fresh window (avoids refetching on every sidebar click)
            gcTime: 5 * 60 * 1000, // Retain in memory for 5 minutes
            refetchOnWindowFocus: false, // Prevent background refetch on tab click
            refetchOnMount: false, // Reuse cached data when returning to a previously visited page
            retry: 1, // Only 1 quick retry for transient failures
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
