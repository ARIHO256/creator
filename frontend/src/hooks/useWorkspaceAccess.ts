import { useMemo } from "react";
import { useRolesWorkspaceQuery } from "./api/useWorkspaceRoles";

export function useWorkspaceAccess(permissionId: string | undefined) {
  const rolesQuery = useRolesWorkspaceQuery();

  const allowed = useMemo(() => {
    if (!permissionId) return true;
    const perms = rolesQuery.data?.effectivePermissions;
    if (!perms) return true;
    return Boolean(perms[permissionId]);
  }, [permissionId, rolesQuery.data?.effectivePermissions]);

  return {
    ...rolesQuery,
    allowed,
    effectivePermissions: rolesQuery.data?.effectivePermissions ?? {},
    currentMember: rolesQuery.data?.currentMember ?? null
  };
}
