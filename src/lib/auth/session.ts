export type UserRole = "student" | "master";

export type OnboardingPrefs = {
  genre: string;
  problems: string[];
  style: string;
  completedAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  studentId?: string;
  masterId?: string;
  onboardingPrefs?: OnboardingPrefs | null;
};

const SESSION_KEY = "eum_session_v1";

/** 로그인 세션 캐시(역할·ID). 비즈니스 데이터는 Supabase DB에 저장 */

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
  const serialized = JSON.stringify(user);
  const prev = localStorage.getItem(SESSION_KEY);
  if (prev === serialized) return;
  localStorage.setItem(SESSION_KEY, serialized);
  window.dispatchEvent(new CustomEvent("eum-auth-updated"));
}

/** SessionProvider 내부 동기화용 — 이벤트를 발생시키지 않음 */
export function persistSession(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function hasCompleteSession(user: AuthUser | null) {
  if (!user) return false;
  return user.role === "master" ? Boolean(user.masterId) : Boolean(user.studentId);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  const hadSession = localStorage.getItem(SESSION_KEY) !== null;
  if (!hadSession) {
    void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
      invalidateAuthUserCache();
    });
    void import("@/lib/db/api").then(({ invalidateDbCache }) => {
      invalidateDbCache();
    });
    return;
  }
  localStorage.removeItem(SESSION_KEY);
  void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
    invalidateAuthUserCache();
  });
  void import("@/lib/db/api").then(({ invalidateDbCache }) => {
    invalidateDbCache();
  });
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
