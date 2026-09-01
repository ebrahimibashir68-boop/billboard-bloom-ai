// Shared Pi auth helpers used by server routes.
// The Pi Platform HTTP surface itself lives in ./platform.server.ts.
export { verifyPiUser, bearer } from "./platform.server";

export function isAdminPiUid(uid: string): boolean {
  const list = (process.env.ADMIN_PI_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // If no admins are configured nobody is an admin — operators opt in by
  // setting the ADMIN_PI_UIDS secret.
  return list.includes(uid);
}
