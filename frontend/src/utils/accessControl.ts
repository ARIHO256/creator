
export type UserStatus = "GUEST" | "AWAITING_APPROVAL" | "NEEDS_ONBOARDING" | "APPROVED";

export const getUserStatus = (): UserStatus => {
    if (typeof window === 'undefined') return "GUEST";

    const isAuthenticated = localStorage.getItem("creatorPlatformEntered") === "true";
    if (!isAuthenticated) return "GUEST";

    const approvalStatus = localStorage.getItem("mldz_creator_approval_status");

    // If we have an approval status and it's not Approved, they are awaiting
    if (approvalStatus && approvalStatus !== "Approved") {
        return "AWAITING_APPROVAL";
    }

    // If they are authenticated but we have no approval status record, 
    // it implies they haven't finished onboarding yet (which triggers approval flow)
    if (!approvalStatus) {
        return "NEEDS_ONBOARDING";
    }

    return "APPROVED";
};


export const IS_EVZONE_ACCOUNTS_CONNECTED = false; // Toggle for production EVzone integration

export const getLandingPageTarget = (targetPath: string): string => {
    if (!IS_EVZONE_ACCOUNTS_CONNECTED) {
        // INTERIM: Direct access to skip redirect notice
        return targetPath;
    }
    // FINAL: Redirect to external EVzone Accounts with target return path
    return `https://accounts.evzone.app?target=${encodeURIComponent(targetPath)}`;
};


export const getUserRole = (): string => {
    if (typeof window === 'undefined') return "creator";
    return localStorage.getItem("userRole") || "owner";
};

export const hasPermission = (permission: string): boolean => {
    const roleId = getUserRole().toLowerCase();

    // 1. Check for stored custom roles from the UI
    if (typeof window !== 'undefined') {
        const savedRolesRaw = localStorage.getItem("mldz:roles:v1");
        if (savedRolesRaw) {
            try {
                const roles = JSON.parse(savedRolesRaw);
                const role = roles.find((r: any) => r.id === roleId);
                if (role && role.perms) {
                    return !!role.perms[permission];
                }
            } catch (e) {
                console.error("Failed to parse roles for permission check", e);
            }
        }
    }

    // 2. Fallback to hardcoded defaults if storage is empty
    if (roleId === "owner") return true;

    const mockPermissions: Record<string, string[]> = {
        "creator_manager": ["reviews.view", "subscription.view"],
        "creator": ["reviews.view"],
        "moderator": []
    };

    return (mockPermissions[roleId] || []).includes(permission);
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
