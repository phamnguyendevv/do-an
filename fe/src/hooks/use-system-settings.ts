import { useQuery } from "@tanstack/react-query";

import { sepayApi } from "@/lib/order-api";
import { SYSTEM_SETTINGS_QUERY_KEY, systemSettingsApi } from "@/lib/system-settings-api";

export function useSystemSettings() {
  return useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: () => systemSettingsApi.get(),
  });
}

export function useSepayConfig() {
  return useQuery({
    queryKey: ["sepay-config"],
    queryFn: () => sepayApi.getConfig(),
    staleTime: 60_000,
  });
}
