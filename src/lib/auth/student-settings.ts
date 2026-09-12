/** 학생 설정 — 알림·계정 로컬/세션 헬퍼 */

import { getSession, setSession, clearSession, type AuthUser } from "@/lib/auth/session";
import { isValidPhone, normalizePhone } from "@/lib/auth/phone";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const ACCOUNTS_KEY = "eum_accounts_v1";
const NOTIF_KEY = "eum-student-notif-prefs";

export type StudentNotifPrefs = {
  feedback: boolean;
  reservation: boolean;
};

type StoredAccount = {
  email: string;
  password: string;
  user: AuthUser;
};

function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function patchLocalAccount(userId: string, patch: { phone?: string; password?: string }) {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.user.id === userId);
  if (idx < 0) return;
  const current = accounts[idx];
  accounts[idx] = {
    ...current,
    password: patch.password ?? current.password,
    user: {
      ...current.user,
      ...(patch.phone ? { phone: patch.phone } : {}),
    },
  };
  saveAccounts(accounts);
}

export function getStudentNotifPrefs(): StudentNotifPrefs {
  if (typeof window === "undefined") return { feedback: true, reservation: true };
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return { feedback: true, reservation: true };
    const parsed = JSON.parse(raw) as Partial<StudentNotifPrefs>;
    return {
      feedback: parsed.feedback !== false,
      reservation: parsed.reservation !== false,
    };
  } catch {
    return { feedback: true, reservation: true };
  }
}

export function saveStudentNotifPrefs(prefs: StudentNotifPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

/** 이메일·비밀번호로 가입한 계정 (소셜 없음 — 현재 전부 해당) */
export function canChangePassword(session: AuthUser | null) {
  return Boolean(session?.email && session.email.includes("@"));
}

export async function updateStudentPhone(rawPhone: string): Promise<{ error?: string }> {
  const session = getSession();
  if (!session) return { error: "로그인이 필요해요." };
  if (!isValidPhone(rawPhone)) return { error: "휴대폰 번호를 확인해 주세요." };
  const phone = normalizePhone(rawPhone);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", session.id);
      if (error) return { error: "번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
    } catch {
      return { error: "번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
  }

  const next = { ...session, phone };
  setSession(next);
  patchLocalAccount(session.id, { phone });
  return {};
}

export async function updateStudentPassword(input: {
  currentPassword: string;
  nextPassword: string;
}): Promise<{ error?: string }> {
  const session = getSession();
  if (!session) return { error: "로그인이 필요해요." };
  if (input.nextPassword.length < 8) return { error: "새 비밀번호는 8자 이상이어야 해요." };
  if (input.currentPassword === input.nextPassword) {
    return { error: "현재 비밀번호와 다르게 입력해 주세요." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: input.currentPassword,
      });
      if (signInError) return { error: "현재 비밀번호가 맞지 않아요." };

      const { error } = await supabase.auth.updateUser({ password: input.nextPassword });
      if (error) return { error: "비밀번호 변경에 실패했어요." };
      return {};
    } catch {
      return { error: "비밀번호 변경에 실패했어요." };
    }
  }

  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.user.id === session.id);
  if (idx < 0) return { error: "계정을 찾을 수 없어요." };
  if (accounts[idx].password !== input.currentPassword) {
    return { error: "현재 비밀번호가 맞지 않아요." };
  }
  accounts[idx] = { ...accounts[idx], password: input.nextPassword };
  saveAccounts(accounts);
  return {};
}

export async function deleteStudentAccount(): Promise<{ error?: string }> {
  const session = getSession();
  if (!session) return { error: "로그인이 필요해요." };

  if (isSupabaseConfigured()) {
    // 서버 측 삭제 API가 없으면 세션만 종료 — UI에서 안내
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }

  const accounts = loadAccounts().filter((a) => a.user.id !== session.id);
  saveAccounts(accounts);
  clearSession();
  return {};
}
