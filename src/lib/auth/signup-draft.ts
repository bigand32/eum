const DRAFT_KEY = "eum_signup_master_draft_v1";

export type MasterSignupDraft = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export function saveMasterSignupDraft(draft: MasterSignupDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadMasterSignupDraft(): MasterSignupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MasterSignupDraft;
  } catch {
    return null;
  }
}

export function clearMasterSignupDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}
