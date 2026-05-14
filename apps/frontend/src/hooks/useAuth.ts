import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { trpc } from "@/providers/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } = options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();
  const adminLogoutMutation = trpc.adminAuth.logout.useMutation();

  const logout = useCallback(() => {
    void (async () => {
      try {
        if (user?.role === "admin") {
          await adminLogoutMutation.mutateAsync();
        } else {
          await logoutMutation.mutateAsync();
        }
      } catch {
        // Clear local session state even if the server-side cookie clear fails.
      }

      utils.auth.me.setData(undefined, undefined);
      await utils.invalidate();
      window.location.assign(redirectPath);
    })();
  }, [user, logoutMutation, adminLogoutMutation, utils, redirectPath]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending || adminLogoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, adminLogoutMutation.isPending, error, logout, refetch],
  );
}
