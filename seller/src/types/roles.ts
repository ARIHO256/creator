export const USER_ROLES = ["seller", "provider"] as const;

export type UserRole = typeof USER_ROLES[number];

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  !!value && (USER_ROLES as readonly string[]).includes(value);
