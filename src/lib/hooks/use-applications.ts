import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationRecord } from "@/types";
import { UserRole } from "@/types/auth";

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string;
  assignedJurisdiction?: { region?: string; state?: string; district?: string };
}

// Stable query keys scoped by role, user, and tenant institution
export const applicationKeys = {
  all: ["applications"] as const,
  lists: (userId?: string, role?: string, institutionId?: string) =>
    [
      ...applicationKeys.all,
      "list",
      userId || "anon",
      role || "public",
      institutionId || "none",
    ] as const,
  details: () => [...applicationKeys.all, "detail"] as const,
  detail: (id: string, userId?: string, role?: string, institutionId?: string) =>
    [
      ...applicationKeys.details(),
      id,
      userId || "anon",
      role || "public",
      institutionId || "none",
    ] as const,
  counts: (userId?: string, role?: string) =>
    ["dashboard", "counts", userId || "anon", role || "public"] as const,
};

// Current authenticated user hook
export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return null;
        const data = await res.json();
        return data.success ? data.data : null;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });
}

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
 * Scoped by current user, role, and institution ID to ensure total query cache isolation.
 */
export function useApplications() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: applicationKeys.lists(user?.userId, user?.role, user?.institutionId),
    queryFn: fetchApplications,
    staleTime: 45 * 1000, // 45 seconds freshness
  });
}

/**
 * Hook: useApplicationDetail
 * Caches specific application details scoped by user identity
 */
export function useApplicationDetail(id: string) {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: applicationKeys.detail(id, user?.userId, user?.role, user?.institutionId),
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
      queryClient.invalidateQueries({ queryKey: applicationKeys.details() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
    setDetailData: (id: string, data: ApplicationRecord) => {
      queryClient.setQueryData(applicationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  };
}
