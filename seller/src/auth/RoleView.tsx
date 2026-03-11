import React from "react";
import type { UserRole } from "../types/roles";
import { getCurrentRole } from "./roles";
import { useSession } from "./session";

type RoleViewProps = {
  provider: React.ReactNode;
  seller: React.ReactNode;
  role?: UserRole;
};

export function RoleView({ provider, seller, role }: RoleViewProps) {
  const session = useSession();
  const resolvedRole = role ?? getCurrentRole(session);
  return <>{resolvedRole === "provider" ? provider : seller}</>;
}

export const withRoleView = <P extends object>(
  ProviderComponent: React.ComponentType<P>,
  SellerComponent: React.ComponentType<P>
) =>
  function WithRoleView(props: P) {
    const session = useSession();
    const role = getCurrentRole(session);
    const Component = role === "provider" ? ProviderComponent : SellerComponent;
    return <Component {...props} />;
  };
