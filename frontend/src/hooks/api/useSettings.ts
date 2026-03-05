import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { CreatorSettings, PayoutSettingsActionInput } from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useSettingsQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getSettings(signal), []);

  return useApiQuery<CreatorSettings>(queryKeys.settings.root(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 60_000
  });
}

const settingsInvalidations = [
  queryKeys.settings.root(),
  queryKeys.app.bootstrap(),
  queryKeys.auth.me(),
  queryKeys.finance.earningsSummary(),
  queryKeys.finance.payouts()
];

export function useUpdateSettingsMutation() {
  return useApiMutation<CreatorSettings, Partial<CreatorSettings>>(
    (patch) => apiClient.updateSettings(patch),
    {
      invalidate: settingsInvalidations
    }
  );
}

export function useSendPayoutVerificationCodeMutation() {
  return useApiMutation<CreatorSettings, PayoutSettingsActionInput>(
    (payload) => apiClient.sendPayoutVerificationCode(payload),
    { invalidate: settingsInvalidations }
  );
}

export function useVerifyPayoutSettingsMutation() {
  return useApiMutation<CreatorSettings, PayoutSettingsActionInput>(
    (payload) => apiClient.verifyPayoutSettings(payload),
    { invalidate: settingsInvalidations }
  );
}

export function useRemoveSettingsDeviceMutation() {
  return useApiMutation<CreatorSettings, string>(
    (deviceId) => apiClient.removeSettingsDevice(deviceId),
    { invalidate: settingsInvalidations }
  );
}

export function useSignOutAllSettingsDevicesMutation() {
  return useApiMutation<CreatorSettings, void>(
    () => apiClient.signOutAllSettingsDevices(),
    { invalidate: settingsInvalidations }
  );
}
