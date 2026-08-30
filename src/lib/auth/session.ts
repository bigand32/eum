export type UserRole = "student" | "master";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  studentId?: string;
  masterId?: string;
};

const SESSION_KEY = "eum_session_v1";

export function getSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function setSession(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("eum-auth-updated"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("eum-auth-updated"));
}

export async function signOut() {
  if (typeof window === "undefined") return;

  const { isSupabaseConfigured } = await import("@/lib/supabase/config");
  if (isSupabaseConfigured()) {
    const { logoutSupabase } = await import("@/lib/auth/supabase-auth");
    await logoutSupabase();
  }

  clearSession();
}

export function getHomePathForRole(role: UserRole) {
  return role === "master" ? "/master" : "/";
}
