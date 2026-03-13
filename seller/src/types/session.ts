import type { UserRole } from "./roles";

export type Session = {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: UserRole;
  roles?: UserRole[];
  onboardingRequired?: boolean;
  [key: string]: unknown;
};
