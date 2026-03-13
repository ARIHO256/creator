import type { UserRole } from "./roles";

export type Session = {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  role?: UserRole;
  roles?: UserRole[];
  onboardingRequired?: boolean;
  onboardingCompleted?: boolean;
  approvalStatus?: string;
  [key: string]: unknown;
};
