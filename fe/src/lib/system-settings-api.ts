import { apiRequest } from "./api-client";
import type { SepayConfig, StoreBranding } from "@/services/store-settings";

export type SystemSettings = {
  sepay: SepayConfig;
  branding: StoreBranding;
};

export const SYSTEM_SETTINGS_QUERY_KEY = ["system-settings"] as const;

export const systemSettingsApi = {
  get() {
    return apiRequest<SystemSettings>("/admin/settings");
  },

  update(settings: Partial<SystemSettings>) {
    return apiRequest<SystemSettings>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};
