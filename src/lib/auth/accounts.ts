import type { AuthUser, UserRole } from "@/lib/auth/session";
import {
  loginWithSupabase,
  registerWithSupabase,
} from "@/lib/auth/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { registerMaster, registerStudent } from "@/lib/db/store";

type StoredAccount = {
  email: string;
  password: string;
  user: AuthUser;
};

const ACCOUNTS_KEY = "eum_accounts_v1";

function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function loginLocalAccount(email: string, password: string): AuthUser | null {
  const account = loadAccounts().find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  return account?.user ?? null;
}

function registerLocalAccount(input: {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  masterProfile?: {
    title: string;
    bio: string;
    career: string[];
    tags: string[];
    avatarUrl: string;
  };
}): AuthUser {
  const accounts = loadAccounts();
  const email = input.email.trim().toLowerCase();

  if (accounts.some((a) => a.email === email)) {
    throw new Error("ALREADY_EXISTS");
  }

  const userId = `user-${Date.now()}`;
  let user: AuthUser;

  if (input.role === "master") {
    if (!input.masterProfile) throw new Error("MASTER_PROFILE_REQUIRED");
    const master = registerMaster({
      name: input.name.trim(),
      phoneNumber: input.phone,
      title: input.masterProfile.title,
      bio: input.masterProfile.bio,
      career: input.masterProfile.career,
      tags: input.masterProfile.tags,
      avatarUrl: input.masterProfile.avatarUrl,
      heroImageUrl: input.masterProfile.avatarUrl,
    });
    user = {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone,
      role: "master",
      masterId: master.id,
    };
  } else {
    const student = registerStudent({
      name: input.name.trim(),
      phone: input.phone,
    });
    user = {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone,
      role: "student",
      studentId: student.id,
    };
  }

  accounts.push({ email, password: input.password, user });
  saveAccounts(accounts);
  return user;
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  if (isSupabaseConfigured()) {
    return loginWithSupabase(email, password);
  }
  return loginLocalAccount(email, password);
}

export async function registerAccount(input: {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  masterProfile?: {
    title: string;
    bio: string;
    career: string[];
    tags: string[];
    avatarUrl: string;
  };
}): Promise<AuthUser> {
  if (isSupabaseConfigured()) {
    return registerWithSupabase(input);
  }
  return registerLocalAccount(input);
}
