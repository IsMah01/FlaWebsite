import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

type ViewerSession =
  | {
      kind: "candidate";
      id: number;
      name: string;
      email: string;
      isAmbassador: boolean;
      studyStatus?: string;
      hasSubmittedQuestionnaire: boolean;
    }
  | {
      kind: "site-user";
      id: number;
      name: string;
      email?: string | null;
      isAmbassador: false;
      role?: string;
    };

export function useViewerSession() {
  const utils = trpc.useUtils();

  const candidateQuery = trpc.candidateAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const authQuery = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const candidateLogout = trpc.candidateAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const authLogout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const adminLogout = trpc.adminAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const viewer = useMemo<ViewerSession | null>(() => {
    if (authQuery.data?.role === "admin") {
      return {
        kind: "site-user",
        id: authQuery.data.id,
        name: authQuery.data.name || authQuery.data.email || authQuery.data.unionId,
        email: authQuery.data.email,
        role: authQuery.data.role,
        isAmbassador: false,
      };
    }

    if (candidateQuery.data) {
      return {
        kind: "candidate",
        id: candidateQuery.data.id,
        name: `${candidateQuery.data.firstName} ${candidateQuery.data.lastName}`.trim(),
        email: candidateQuery.data.email,
        isAmbassador: candidateQuery.data.isAmbassador,
        studyStatus: candidateQuery.data.studyStatus,
        hasSubmittedQuestionnaire: candidateQuery.data.hasSubmittedQuestionnaire,
      };
    }

    if (authQuery.data) {
      return {
        kind: "site-user",
        id: authQuery.data.id,
        name: authQuery.data.name || authQuery.data.email || authQuery.data.unionId,
        email: authQuery.data.email,
        role: authQuery.data.role,
        isAmbassador: false,
      };
    }

    return null;
  }, [candidateQuery.data, authQuery.data]);

  const logout = useCallback(() => {
    void (async () => {
      try {
        if (viewer?.kind === "candidate") {
          await candidateLogout.mutateAsync();
        } else if (viewer?.kind === "site-user" && viewer.role === "admin") {
          await adminLogout.mutateAsync();
        } else if (viewer?.kind === "site-user") {
          await authLogout.mutateAsync();
        }
      } catch {
        // Clear local session state even if the server-side cookie clear fails.
      }

      utils.candidateAuth.me.setData(undefined, undefined);
      utils.auth.me.setData(undefined, undefined);
      await utils.invalidate();
      window.location.assign("/");
    })();
  }, [viewer, candidateLogout, authLogout, adminLogout, utils]);

  return {
    viewer,
    isAmbassador: viewer?.kind === "candidate" && viewer.isAmbassador,
    hasSubmittedQuestionnaire:
      viewer?.kind === "candidate" ? viewer.hasSubmittedQuestionnaire : false,
    hasAmbassadorView:
      (viewer?.kind === "candidate" && viewer.isAmbassador) ||
      (viewer?.kind === "site-user" && viewer.role === "admin"),
    isCandidateAccount: viewer?.kind === "candidate",
    isCandidate: viewer?.kind === "candidate" && !viewer.isAmbassador,
    isAuthenticated: !!viewer,
    isLoading:
      candidateQuery.isLoading ||
      authQuery.isLoading ||
      candidateLogout.isPending ||
      authLogout.isPending ||
      adminLogout.isPending,
    logout,
  };
}
