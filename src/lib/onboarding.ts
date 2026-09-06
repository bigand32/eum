import { getSession, setSession } from "@/lib/auth/session";
import type { OnboardingPrefs } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export type { OnboardingPrefs };

const LOCAL_KEY = "eum_onboarding_v1";

function localKeyForUser(userId: string) {
  return `${LOCAL_KEY}:${userId}`;
}

function readLocalOnboarding(userId?: string): OnboardingPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    if (userId) {
      const scoped = localStorage.getItem(localKeyForUser(userId));
      if (scoped) return JSON.parse(scoped) as OnboardingPrefs;
    }
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingPrefs;
  } catch {
    return null;
  }
}

function writeLocalOnboarding(userId: string | undefined, prefs: OnboardingPrefs) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(prefs);
  if (userId) localStorage.setItem(localKeyForUser(userId), raw);
  localStorage.setItem(LOCAL_KEY, raw);
  window.dispatchEvent(new CustomEvent("eum-onboarding-updated"));
}

export function getOnboardingPrefs(): OnboardingPrefs | null {
  const session = getSession();
  if (session?.onboardingPrefs?.completedAt) {
    return session.onboardingPrefs;
  }
  return readLocalOnboarding(session?.id);
}

export function isOnboardingComplete() {
  return Boolean(getOnboardingPrefs()?.completedAt);
}

export async function saveOnboardingPrefs(prefs: Omit<OnboardingPrefs, "completedAt">) {
  const payload: OnboardingPrefs = {
    ...prefs,
    completedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw authError ?? new Error("NOT_AUTHENTICATED");

    const session = getSession();
    const name = session?.name || String(user.user_metadata?.name ?? "");
    const phone = session?.phone ?? "";
    const email = user.email ?? session?.email ?? "";

    const { data: existingProfile, error: profileReadError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    if (!existingProfile) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email,
        name,
        phone,
        role: session?.role ?? "student",
        onboarding_prefs: payload,
      });
      if (insertError) throw insertError;
    } else {
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({ onboarding_prefs: payload })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) throw new Error("ONBOARDING_SAVE_FAILED");
    }

    void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
      invalidateAuthUserCache();
    });

    writeLocalOnboarding(user.id, payload);

    if (session?.id === user.id) {
      setSession({ ...session, onboardingPrefs: payload });
    }
    return;
  }

  writeLocalOnboarding(undefined, payload);
}

export const GENRE_OPTIONS = [
  { id: "kpop", label: "K-POP / 아이돌", icon: "fa-microphone-lines" },
  { id: "musical", label: "뮤지컬 / 성악", icon: "fa-masks-theater" },
  { id: "ballad", label: "발라드 / R&B", icon: "fa-guitar" },
  { id: "rap", label: "랩 / 미디작곡", icon: "fa-headphones" },
] as const;

export const PROBLEM_OPTIONS = [
  "고음이 시원하게 안 올라가요",
  "목에 힘이 많이 들어가서 아파요",
  "호흡이 짧고 소리가 흔들려요",
  "나만의 유니크한 톤을 찾고 싶어요",
  "실용음악과 입시/오디션 준비 중이에요",
] as const;

export const STYLE_OPTIONS = [
  { id: "strict", label: "스파르타 · 정확한 지적", icon: "fa-fire" },
  { id: "warm", label: "칭찬 · 격려 중심", icon: "fa-heart" },
  { id: "detail", label: "디테일 · 이론 중심", icon: "fa-book" },
] as const;
