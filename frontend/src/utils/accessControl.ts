import { readStoredUserStatus } from "../api/storage";
import type { FrontendUserStatus } from "../api/types";

export type UserStatus = FrontendUserStatus;

export const getUserStatus = (): UserStatus => {
  return readStoredUserStatus();
};

export const IS_EVZONE_ACCOUNTS_CONNECTED = false;

export const getLandingPageTarget = (targetPath: string): string => {
  if (!IS_EVZONE_ACCOUNTS_CONNECTED) {
    return targetPath;
  }

  return `https://accounts.evzone.app?target=${encodeURIComponent(targetPath)}`;
};

export const getPostAuthTarget = (): string => {
  const status = getUserStatus();

  switch (status) {
    case "AWAITING_APPROVAL":
      return "/account-approval";
    case "NEEDS_ONBOARDING":
      return "/onboarding";
    case "APPROVED":
      return "/home";
    case "GUEST":
    default:
      return "/onboarding";
  }
};
