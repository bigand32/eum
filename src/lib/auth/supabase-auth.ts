import type { AuthUser, UserRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";
import type { DbMaster, DbProfile, DbStudent } from "@/lib/supabase/mappers";

type ProfileWithRelations = DbProfile & {
  students: DbStudent[] | DbStudent | null;
  masters: DbMaster[] | DbMaster | null;
};

function firstRelation<T>(value: T[] | T | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchAuthUser(userId: string): Promise<AuthUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, students!students_user_id_fkey(*), masters!masters_user_id_fkey(*)")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data as ProfileWithRelations;
  const student = firstRelation(profile.students);
  const master = firstRelation(profile.masters);

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    role: profile.role as UserRole,
    studentId: student?.id,
    masterId: master?.id,
  };
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

  const user = await fetchAuthUser(data.user.id);
  if (user) return user;

  // 프로필 조회 실패 시에도 인증은 성공한 상태 — 최소 세션 정보 반환
  return {
    id: data.user.id,
    name: String(data.user.user_metadata?.name ?? ""),
    email: data.user.email ?? email.trim().toLowerCase(),
    phone: "",
    role: (data.user.user_metadata?.role as UserRole) ?? "student",
  };
}

export async function logoutSupabase() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

async function uploadAvatar(userId: string, dataUrl: string): Promise<string> {
  const supabase = createClient();
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1] ?? "jpg";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, bytes, {
    upsert: true,
    contentType: mime,
  });

  if (error) {
    return dataUrl;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

const DEFAULT_MASTER_PRICING = {
  feedbackPrice: 20000,
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
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return fetchAuthUser(user.id);
}
