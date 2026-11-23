// Shared by server and client (client uses it only to hide UI; the server always re-checks).
export type RoleName = "OWNER" | "MANAGER" | "STAFF";

const ALL: RoleName[] = ["OWNER", "MANAGER", "STAFF"];
const MGMT: RoleName[] = ["OWNER", "MANAGER"];

export const PERMISSIONS = {
  "overview:read": ALL,
  "analytics:revenue": MGMT,
  "inbox:read": ALL,
  "inbox:reply": ALL,
  "orders:read": ALL,
  "orders:write": ALL,
  "menu:read": ALL,
  "menu:availability": ALL,
  "menu:write": MGMT,
  "customers:read": ALL,
  "customers:write": MGMT,
  "settings:read": MGMT,
  "settings:write": MGMT,
  "team:manage": ["OWNER"],
  "whatsapp:manage": ["OWNER"],
  "audit:read": MGMT,
  "playground:use": MGMT,
} as const satisfies Record<string, RoleName[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: RoleName | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly RoleName[]).includes(role);
}
