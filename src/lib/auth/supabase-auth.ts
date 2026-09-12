import type { AuthUser, UserRole } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";
import type { DbMaster, DbProfile, DbStudent } from "@/lib/supabase/mappers";
import { ensureMasterProfileSupabase } from "@/lib/db/supabase-store";
import type { User } from "@supabase/supabase-js";

type ProfileWithRelations = DbProfile & {
  students: DbStudent[] | DbStudent | null;
  masters: DbMaster[] | DbMaster | null;
};

const AUTH_USER_CACHE_MS = 5_000;
let authUserCache: { userId: string; user: AuthUser | null; at: number } | null = null;
let authUserInflight: { userId: string; promise: Promise<AuthUser | null> } | null = null;

export function invalidateAuthUserCache() {
  authUserCache = null;
  authUserInflight = null;
}

function firstRelation<T>(value: T[] | T | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function lookupMasterForAuthUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return null;

  const role = (user.user_metadata?.role as UserRole | undefined) ?? "student";
  if (role !== "master") return null;

  const { data: masterRow } = await supabase
    .from("masters")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!masterRow) return null;

  const cached = typeof window !== "undefined" ? getSession() : null;

  return {
    id: userId,
    name: String(user.user_metadata?.name ?? cached?.name ?? masterRow.name ?? ""),
    email: user.email ?? cached?.email ?? "",
    phone: cached?.phone ?? "",
    role: "master",
    masterId: masterRow.id,
    onboardingPrefs: cached?.onboardingPrefs ?? null,
  };
}

function buildAuthUserFromAuthRecord(user: User, profile: AuthUser | null): AuthUser {
  if (profile) return profile;

  const cached = typeof window !== "undefined" ? getSession() : null;
  if (cached?.id === user.id) return cached;

  return {
    id: user.id,
    name: String(user.user_metadata?.name ?? cached?.name ?? ""),
    email: user.email ?? cached?.email ?? "",
    phone: cached?.phone ?? "",
    role: (user.user_metadata?.role as UserRole) ?? cached?.role ?? "student",
    studentId: cached?.studentId,
    masterId: cached?.masterId,
  };
}

export async function fetchAuthUser(userId: string): Promise<AuthUser | null> {
  if (
    authUserCache?.userId === userId &&
    Date.now() - authUserCache.at < AUTH_USER_CACHE_MS
  ) {
    return authUserCache.user;
  }

  if (authUserInflight?.userId === userId) {
    return authUserInflight.promise;
  }

  const promise = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*, students!students_user_id_fkey(*), masters!masters_user_id_fkey(*)")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      const masterFromDb = await lookupMasterForAuthUser(supabase, userId);
      if (masterFromDb) {
        authUserCache = { userId, user: masterFromDb, at: Date.now() };
        return masterFromDb;
      }
      authUserCache = { userId, user: null, at: Date.now() };
      return null;
    }

    const profile = data as ProfileWithRelations;
    let student = firstRelation(profile.students);
    let master = firstRelation(profile.masters);

    // 마스터/학생 겸용이 가능하므로 role과 무관하게 양쪽 행을 조회
    if (!student) {
      const { data: studentRow } = await supabase
        .from("students")
        .select("*, profiles!students_user_id_fkey(name, phone)")
        .eq("user_id", userId)
        .maybeSingle();
      student = (studentRow as DbStudent | null) ?? null;
    }

    if (!master) {
      const { data: masterRow } = await supabase
        .from("masters")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      master = (masterRow as DbMaster | null) ?? null;
    }

    if (!master && profile.role === "master") {
      try {
        const ensured = await ensureMasterProfileSupabase({
          name: profile.name,
          phone: profile.phone ?? "",
        });
        master = {
          id: ensured.id,
          user_id: userId,
          name: ensured.name,
          title: ensured.title,
          avatar_url: ensured.avatarUrl,
          hero_image_url: ensured.heroImageUrl,
          rating: ensured.rating,
          review_count: ensured.reviewCount,
          feedback_count: ensured.feedbackCount,
          response_time_label: ensured.responseTimeLabel,
          tags: ensured.tags,
          bio: ensured.bio,
          rank_label: ensured.rankLabel ?? null,
          career: ensured.career,
          phone_number: ensured.phoneNumber,
          pricing: ensured.pricing,
          created_at: new Date().toISOString(),
        };
      } catch {
        // 프로필 생성 실패 시 masterId 없이 진행
      }
    }

    let onboardingPrefs: AuthUser["onboardingPrefs"] = profile.onboarding_prefs ?? null;
    if (!onboardingPrefs?.completedAt && typeof window !== "undefined") {
      try {
        const scoped = localStorage.getItem(`eum_onboarding_v1:${userId}`);
        if (scoped) {
          onboardingPrefs = JSON.parse(scoped) as NonNullable<AuthUser["onboardingPrefs"]>;
        }
      } catch {
        // ignore
      }
    }

    let user: AuthUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? "",
      role: profile.role as UserRole,
      studentId: student?.id,
      masterId: master?.id,
      onboardingPrefs: onboardingPrefs ?? null,
    };

    if (!user.masterId) {
      const masterFromDb = await lookupMasterForAuthUser(supabase, userId);
      if (masterFromDb?.masterId) {
        user = {
          ...user,
          role: masterFromDb.role,
          masterId: masterFromDb.masterId,
          name: user.name || masterFromDb.name,
        };
      }
    }

    authUserCache = { userId, user, at: Date.now() };
    return user;
  })();

  authUserInflight = { userId, promise };
  try {
    return await promise;
  } finally {
    if (authUserInflight?.userId === userId) {
      authUserInflight = null;
    }
  }
}

export async function loginWithSupabase(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) return null;

  invalidateAuthUserCache();
  const { invalidateDbCache } = await import("@/lib/db/api");
  invalidateDbCache();
  const user = await fetchAuthUser(data.user.id);
  if (user) return user;

  return buildAuthUserFromAuthRecord(data.user, null);
}

export async function logoutSupabase() {
  const supabase = createClient();
  invalidateAuthUserCache();
  const { invalidateDbCache } = await import("@/lib/db/api");
  invalidateDbCache();
  await supabase.auth.signOut();
}

async function uploadAvatar(userId: string, dataUrl: string): Promise<string> {
  const supabase = createClient();
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1] ?? "jpg";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  // cache bust so browsers refresh the public URL after upsert
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, bytes, {
    upsert: true,
    contentType: mime,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

async function saveMasterVerification(
  userId: string,
  masterId: string,
  file: { fileName: string; mimeType: string; dataUrl: string },
) {
  const supabase = createClient();
  const [meta, base64] = file.dataUrl.split(",");
  if (!base64) return;
  const mime = file.mimeType || meta.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const extFromName = file.fileName.split(".").pop()?.toLowerCase();
  const ext = extFromName && extFromName.length <= 5 ? extFromName : mime.split("/")[1] || "bin";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${userId}/credential-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("master-verification").upload(path, bytes, {
    upsert: false,
    contentType: mime,
  });
  if (uploadError) {
    console.warn("master verification upload skipped", uploadError.message);
    return;
  }

  const { error } = await supabase.from("master_verifications").insert({
    master_id: masterId,
    user_id: userId,
    document_path: path,
    file_name: file.fileName,
    status: "pending",
  });
  if (error) {
    console.warn("master verification record skipped", error.message);
  }
}

export async function uploadMasterAvatar(dataUrl: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return uploadAvatar(user.id, dataUrl);
}

const DEFAULT_MASTER_PRICING = {
  feedbackPrice: 69000,
  feedbackAdditionalPrice: 69000,
  phonePrice15Min: 18000,
  phonePrice30Min: 30000,
  visitPrice: 80000,
  visitDurationMin: 60,
  feedbackIncludedMin: 5,
  feedbackExtraPer5Min: 2000,
  updatedAt: new Date().toISOString(),
};

function isAlreadyRegisteredMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already registered")
  );
}

async function ensureAuthSession(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
): Promise<string> {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    if (signInError.message.toLowerCase().includes("email not confirmed")) {
      throw new Error("EMAIL_NOT_CONFIRMED");
    }
    throw new Error("ALREADY_EXISTS");
  }

  const userId = signInData.user?.id;
  if (!userId) throw new Error("SIGNUP_FAILED");
  return userId;
}

async function ensureProfile(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    email: string;
    name: string;
    phone: string;
    role: UserRole;
  },
) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();

  if (existingProfile) return;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: input.userId,
    email: input.email,
    name: input.name,
    phone: input.phone,
    role: input.role,
  });

  if (profileError) throw profileError;
}

export async function registerWithSupabase(input: {
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
    verificationFile?: {
      fileName: string;
      mimeType: string;
      dataUrl: string;
    };
  };
}): Promise<AuthUser> {
  const supabase = createClient();
  const email = input.email.trim().toLowerCase();
  let userId: string | undefined;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        role: input.role,
      },
    },
  });

  if (authError) {
    if (isAlreadyRegisteredMessage(authError.message)) {
      userId = await ensureAuthSession(supabase, email, input.password);
    } else {
      throw authError;
    }
  } else {
    userId = authData.user?.id;

    if (!authData.session && userId) {
      userId = await ensureAuthSession(supabase, email, input.password);
    }
  }

  if (!userId) throw new Error("SIGNUP_FAILED");

  const existingUser = await fetchAuthUser(userId);
  if (existingUser?.studentId || existingUser?.masterId) {
    throw new Error("ALREADY_EXISTS");
  }

  await ensureProfile(supabase, {
    userId,
    email,
    name: input.name.trim(),
    phone: input.phone,
    role: input.role,
  });

  if (input.role === "student") {
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingStudent) {
      return {
        id: userId,
        name: input.name.trim(),
        email,
        phone: input.phone,
        role: "student",
        studentId: existingStudent.id,
      };
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({ user_id: userId, points: 0 })
      .select("id")
      .single();

    if (studentError) throw studentError;

    return {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone,
      role: "student",
      studentId: student.id,
    };
  }

  if (!input.masterProfile) throw new Error("MASTER_PROFILE_REQUIRED");

  const { data: existingMaster } = await supabase
    .from("masters")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMaster) {
    if (input.masterProfile.verificationFile) {
      await saveMasterVerification(userId, existingMaster.id, input.masterProfile.verificationFile);
    }
    return {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone,
      role: "master",
      masterId: existingMaster.id,
    };
  }

  const avatarUrl = input.masterProfile.avatarUrl.startsWith("data:")
    ? await uploadAvatar(userId, input.masterProfile.avatarUrl)
    : input.masterProfile.avatarUrl;

  const { data: master, error: masterError } = await supabase
    .from("masters")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      title: input.masterProfile.title,
      bio: input.masterProfile.bio,
      career: input.masterProfile.career,
      tags: input.masterProfile.tags,
      avatar_url: avatarUrl,
      hero_image_url: avatarUrl,
      phone_number: input.phone,
      pricing: DEFAULT_MASTER_PRICING,
    })
    .select("id")
    .single();

  if (masterError) throw masterError;

  if (input.masterProfile.verificationFile) {
    await saveMasterVerification(userId, master.id, input.masterProfile.verificationFile);
  }

  return {
    id: userId,
    name: input.name.trim(),
    email,
    phone: input.phone,
    role: "master",
    masterId: master.id,
  };
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUser = session?.user;
  if (!authUser) return null;

  const profile = await fetchAuthUser(authUser.id);
  return buildAuthUserFromAuthRecord(authUser, profile);
}
