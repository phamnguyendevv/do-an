import { useEffect, useSyncExternalStore } from "react";
import { authStore } from "@/services/auth-service";

export function useAuth() {
  const user = useSyncExternalStore(
    authStore.subscribe,
    authStore.get,
    () => null,
  );
  const hydrated = useSyncExternalStore(
    authStore.subscribe,
    authStore.isHydrated,
    () => false,
  );

  useEffect(() => {
    authStore.hydrate();
  }, []);

  return {
    user,
    hydrated,
    role: user?.role ?? "STAFF",
    login: authStore.login,
    logout: authStore.logout,
  };
}
