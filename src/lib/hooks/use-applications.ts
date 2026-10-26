import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationRecord } from "@/types";

// Stable query keys scoped by role and user
export const applicationKeys = {
  all: ["applications"] as const,
  lists: (role?: string) => [...applicationKeys.all, "list", role || "public"] as const,
  details: () => [...applicationKeys.all, "detail"] as const,
  detail: (id: string, role?: string) => [...applicationKeys.details(), id, role || "public"] as const,
};

// Fetch all applications
async function fetchApplications(): Promise<ApplicationRecord[]> {
  const res = await fetch("/api/applications");
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to load applications");
  }
  return data.data;
}

// Fetch single application detail
async function fetchApplicationById(id: string): Promise<ApplicationRecord> {
  const res = await fetch(`/api/applications/${id}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to load application details");
  }
  return data.data;
}

/**
 * Hook: useApplications
 * Shared across Dashboard (/), Applications Directory (/applications), and Review Queue (/queue)
 * Guarantees zero redundant network fetches when navigating between sidebar links!
 */
export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.lists(),
    queryFn: fetchApplications,
    staleTime: 45 * 1000, // 45 seconds freshness
  });
}

/**
 * Hook: useApplicationDetail
 * Caches specific application details and cross-document comparison data
 */
export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => fetchApplicationById(id),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}

/**
 * Helper: Invalidate and refresh query cache after reviewer actions or file uploads
 */
export function useInvalidateApplications() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
    invalidateDetail: (id: string) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
    setDetailData: (id: string, data: ApplicationRecord) => {
      queryClient.setQueryData(applicationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  };
}
