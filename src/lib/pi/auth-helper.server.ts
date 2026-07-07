// Shared Pi user verification helper used by server routes.
const PI_API_BASE = "https://api.minepi.com/v2";

export async function verifyPiUser(
  accessToken: string,
): Promise<{ uid: string; username: string } | null> {
  try {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { uid?: string; username?: string };
    if (!data.uid || !data.username) return null;
    return { uid: data.uid, username: data.username };
  } catch {
    return null;
  }
}

export function bearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

export function isAdminPiUid(uid: string): boolean {
  const list = (process.env.ADMIN_PI_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // If no admins configured, allow first user to bootstrap by env var — safe
  // fallback: no admin exists. Users can set ADMIN_PI_UIDS as a secret.
  return list.includes(uid);
}
