import React from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "../types/roles";
import { getCurrentRole } from "./roles";
import { isValidSession, useSession } from "./session";

type RoleGuardProps = {
  roles: UserRole[];
  children: React.ReactElement;
  redirectTo?: string;
};

export default function RoleGuard({ roles, children, redirectTo = "/auth" }: RoleGuardProps) {
  const session = useSession();
  if (!isValidSession(session)) return <Navigate to={redirectTo} replace />;
  const role = getCurrentRole(session);
  if (roles.includes(role)) return children;
  return <Navigate to={redirectTo} replace />;
}

export const SellerGuard = ({ children }: { children: React.ReactElement }) => (
  <RoleGuard roles={["seller"]} redirectTo="/auth">
    {children}
  </RoleGuard>
);

export const ProviderGuard = ({ children }: { children: React.ReactElement }) => (
  <RoleGuard roles={["provider"]} redirectTo="/auth">
    {children}
  </RoleGuard>
);

export const SellerOrProviderGuard = ({ children }: { children: React.ReactElement }) => (
  <RoleGuard roles={["seller", "provider"]} redirectTo="/auth">
    {children}
  </RoleGuard>
);
