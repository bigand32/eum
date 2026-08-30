export type OnboardingPrefs = {
  genre: string;
  problems: string[];
  style: string;
  completedAt: string;
};

const KEY = "eum_onboarding_v1";

export function getOnboardingPrefs(): OnboardingPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingPrefs;
  } catch {
    return null;
  }
}

export function isOnboardingComplete() {
  return getOnboardingPrefs()?.completedAt != null;
}

export function saveOnboardingPrefs(prefs: Omit<OnboardingPrefs, "completedAt">) {
  if (typeof window === "undefined") return;
  const payload: OnboardingPrefs = {
    ...prefs,
    completedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("eum-onboarding-updated"));
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
