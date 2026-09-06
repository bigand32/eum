import type {
  EumDatabase,
  FeedbackOrder,
  LessonMode,
  Master,
  MasterCoupon,
  MasterPackage,
  MasterPricing,
  PackageLevel,
  PackagePurchase,
  PackageWeek,
  Reservation,
  TimestampComment,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import {
  mapDatabase,
  mapFeedbackOrder,
  mapMaster,
  mapMasterCoupon,
  mapMasterPackage,
  mapPackagePurchase,
  mapPracticeRecord,
  mapReservation,
  type DbFeedbackOrder,
  type DbMaster,
  type DbMasterCoupon,
  type DbMasterPackage,
  type DbPackagePurchase,
  type DbPracticeRecord,
  type DbReservation,
  type DbStudent,
  type DbStudentCouponClaim,
  type DbStudentReview,
} from "@/lib/supabase/mappers";

let resolvedStudentId: { userId: string; id: string } | null = null;

async function resolveAuthenticatedStudentId(_preferredId?: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw authError ?? new Error("NOT_AUTHENTICATED");
  }

  if (resolvedStudentId?.userId === user.id) {
    return resolvedStudentId.id;
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studentError) throw studentError;
  if (student?.id) {
    resolvedStudentId = { userId: user.id, id: student.id };
    return student.id;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.role !== "student") {
    throw new Error("STUDENT_PROFILE_REQUIRED");
  }

  const { data: created, error: createError } = await supabase
    .from("students")
    .insert({ user_id: user.id, points: 0 })
    .select("id")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("STUDENT_CREATE_FAILED");
  }

  void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
    invalidateAuthUserCache();
  });

  resolvedStudentId = { userId: user.id, id: created.id };
  return created.id;
}

const RECENT_ROWS_LIMIT = 80;

const DEFAULT_MASTER_PRICING: MasterPricing = {
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

export async function ensureMasterProfileSupabase(input: {
  name: string;
  phone?: string;
}): Promise<Master> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw authError ?? new Error("NOT_AUTHENTICATED");
  }

  const { data: existing, error: existingError } = await supabase
    .from("masters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return mapMaster(existing as DbMaster);

  await ensureProfileRow(supabase, user, input);

  const claimed = await claimOrphanMasterByName(supabase, user.id, input.name);
  if (claimed) return claimed;

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=f3f4f6&color=111827&font-size=0.4`;

  const { data, error } = await supabase
    .from("masters")
    .insert({
      user_id: user.id,
      name: input.name,
      title: `${input.name} 마스터`,
      bio: "",
      career: [],
      tags: [],
      avatar_url: avatarUrl,
      hero_image_url: avatarUrl,
      phone_number: input.phone ?? "",
      pricing: DEFAULT_MASTER_PRICING,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("MASTER_CREATE_FAILED");
  }

  void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
    invalidateAuthUserCache();
  });

  return mapMaster(data as DbMaster);
}

async function ensureProfileRow(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; email?: string | null },
  input: { name: string; phone?: string },
) {
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.role !== "master") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: "master",
          name: input.name,
          phone: input.phone ?? "",
        })
        .eq("id", user.id);
      if (updateError) throw updateError;
    }
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? "",
    name: input.name,
    phone: input.phone ?? "",
    role: "master",
  });

  if (insertError) throw insertError;
}

async function claimOrphanMasterByName(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  name: string,
): Promise<Master | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: orphan, error: orphanError } = await supabase
    .from("masters")
    .select("*")
    .is("user_id", null)
    .eq("name", trimmed)
    .maybeSingle();

  if (orphanError || !orphan) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("masters")
    .update({ user_id: userId })
    .eq("id", orphan.id)
    .is("user_id", null)
    .select("*")
    .single();

  if (claimError || !claimed) return null;

  void import("@/lib/auth/supabase-auth").then(({ invalidateAuthUserCache }) => {
    invalidateAuthUserCache();
  });

  return mapMaster(claimed as DbMaster);
}

/** 목록용 마스터 컬럼 */
const MASTER_LIST_COLUMNS =
  "id, user_id, name, title, avatar_url, hero_image_url, rating, review_count, feedback_count, response_time_label, tags, bio, rank_label, career, phone_number, pricing, off_weekdays, booking_times, off_dates, created_at";

/** 피드백 목록용 — 미디어/코멘트 본문은 상세(fetchFeedbackOrder)에서 */
const FEEDBACK_LIST_COLUMNS =
  "id, student_id, master_id, status, price_at_purchase, student_message, media_label, media_type, media_duration_sec, extra_duration_fee, practice_record_id, master_summary, recommended_package_id, created_at, paid_at, completed_at";

/** 학생 목록용 — weeks(영상 URL JSON) 제외로 페이로드 축소 */
const PACKAGE_LIST_COLUMNS =
  "id, master_id, level, title, description, cover_url, price_visit, price_phone, price_video, is_active, created_at";

async function resolveUserScope(userId?: string): Promise<{
  studentId?: string;
  masterId?: string;
}> {
  if (!userId) return {};
  const supabase = createClient();
  const [studentRes, masterRes] = await Promise.all([
    supabase.from("students").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("masters").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    studentId: studentRes.data?.id ?? undefined,
    masterId: masterRes.data?.id ?? undefined,
  };
}

export async function fetchDb(userId?: string): Promise<EumDatabase> {
  const supabase = createClient();

  const safe = async <T,>(query: PromiseLike<{ data: T | null; error: unknown }>) => {
    try {
      const result = await query;
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  const scope = await resolveUserScope(userId);
  const { studentId, masterId } = scope;

  let ordersQuery = supabase
    .from("feedback_orders")
    .select(FEEDBACK_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let reservationsQuery = supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let practiceQuery = supabase
    .from("practice_records")
    .select("id, student_id, title, memo, duration_sec, media_url, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let claimsQuery = supabase
    .from("student_coupon_claims")
    .select("*")
    .order("claimed_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let purchasesQuery = supabase
    .from("package_purchases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let couponsQuery = supabase
    .from("master_coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  // 기본: 학생용 경량(weeks 제외). 마스터면 아래에서 weeks 포함으로 교체
  let packagesQuery = supabase
    .from("master_packages")
    .select(PACKAGE_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(RECENT_ROWS_LIMIT);
  let studentsQuery = supabase
    .from("students")
    .select("id, user_id, points, created_at, profiles!students_user_id_fkey(name, phone)");

  if (studentId && masterId) {
    ordersQuery = ordersQuery.or(`student_id.eq.${studentId},master_id.eq.${masterId}`);
    reservationsQuery = reservationsQuery.or(
      `student_id.eq.${studentId},master_id.eq.${masterId}`,
    );
    practiceQuery = practiceQuery.eq("student_id", studentId);
    claimsQuery = claimsQuery.eq("student_id", studentId);
    purchasesQuery = purchasesQuery.eq("student_id", studentId);
    packagesQuery = supabase
      .from("master_packages")
      .select("*")
      .or(`master_id.eq.${masterId},is_active.eq.true`)
      .order("created_at", { ascending: false })
      .limit(RECENT_ROWS_LIMIT);
    couponsQuery = couponsQuery.or(`master_id.eq.${masterId},is_active.eq.true`);
    studentsQuery = studentsQuery.eq("id", studentId);
  } else if (studentId) {
    ordersQuery = ordersQuery.eq("student_id", studentId);
    reservationsQuery = reservationsQuery.eq("student_id", studentId);
    practiceQuery = practiceQuery.eq("student_id", studentId);
    claimsQuery = claimsQuery.eq("student_id", studentId);
    purchasesQuery = purchasesQuery.eq("student_id", studentId);
    packagesQuery = packagesQuery.eq("is_active", true);
    couponsQuery = couponsQuery.eq("is_active", true);
    studentsQuery = studentsQuery.eq("id", studentId);
  } else if (masterId) {
    ordersQuery = ordersQuery.eq("master_id", masterId);
    reservationsQuery = reservationsQuery.eq("master_id", masterId);
    practiceQuery = practiceQuery.limit(0);
    claimsQuery = claimsQuery.limit(0);
    packagesQuery = supabase
      .from("master_packages")
      .select("*")
      .eq("master_id", masterId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ROWS_LIMIT);
    couponsQuery = couponsQuery.eq("master_id", masterId);
  }

  const [
    mastersRes,
    studentsRes,
    ordersRes,
    reservationsRes,
    reviewsRes,
    practiceRes,
    couponsRes,
    claimsRes,
    packagesRes,
    purchasesRes,
    favMastersRes,
    favAcademiesRes,
  ] = await Promise.all([
    safe(
      supabase.from("masters").select(MASTER_LIST_COLUMNS).order("created_at"),
    ).then(async (res) => {
      if (res.error || !res.data) {
        return safe(supabase.from("masters").select("*"));
      }
      return res;
    }),
    safe(studentsQuery),
    safe(ordersQuery).then(async (res) => {
      if (res.error) {
        console.warn("[eum] feedback_orders fetch failed, retrying", res.error);
        return safe(
          supabase
            .from("feedback_orders")
            .select(FEEDBACK_LIST_COLUMNS)
            .order("created_at", { ascending: false })
            .limit(RECENT_ROWS_LIMIT),
        );
      }
      return res;
    }),
    safe(reservationsQuery),
    safe(
      supabase
        .from("student_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(RECENT_ROWS_LIMIT),
    ),
    safe(practiceQuery),
    safe(couponsQuery),
    safe(claimsQuery),
    safe(packagesQuery),
    safe(purchasesQuery),
    userId
      ? safe(supabase.from("favorite_masters").select("master_id").eq("user_id", userId))
      : Promise.resolve({ data: [], error: null }),
    userId
      ? safe(supabase.from("favorite_academies").select("academy_id").eq("user_id", userId))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (mastersRes.error) throw mastersRes.error;

  let students = (studentsRes.data ?? []) as DbStudent[];

  if (masterId && !studentId) {
    const orderStudentIds = new Set(
      ((ordersRes.data ?? []) as { student_id: string }[]).map((o) => o.student_id),
    );
    for (const r of (reservationsRes.data ?? []) as { student_id: string }[]) {
      orderStudentIds.add(r.student_id);
    }
    const ids = [...orderStudentIds];
    if (ids.length > 0) {
      const extra = await safe(
        supabase
          .from("students")
          .select("id, user_id, points, created_at, profiles!students_user_id_fkey(name, phone)")
          .in("id", ids),
      );
      students = (extra.data ?? []) as DbStudent[];
    }
  }

  return mapDatabase({
    masters: (mastersRes.data ?? []) as DbMaster[],
    students,
    feedbackOrders: (ordersRes.data ?? []) as DbFeedbackOrder[],
    reservations: (reservationsRes.data ?? []) as DbReservation[],
    favoriteMasterIds: (favMastersRes.data ?? []).map(
      (row: { master_id: string }) => row.master_id,
    ),
    favoriteAcademyIds: (favAcademiesRes.data ?? []).map(
      (row: { academy_id: string }) => row.academy_id,
    ),
    studentReviews: (reviewsRes.data ?? []) as DbStudentReview[],
    practiceRecords: (practiceRes.data ?? []) as DbPracticeRecord[],
    masterCoupons: (couponsRes.data ?? []) as DbMasterCoupon[],
    studentCouponClaims: (claimsRes.data ?? []) as DbStudentCouponClaim[],
    masterPackages: (packagesRes.data ?? []) as DbMasterPackage[],
    packagePurchases: (purchasesRes.data ?? []) as DbPackagePurchase[],
  });
}

export async function fetchMaster(id: string): Promise<Master | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("masters").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return mapMaster(data as DbMaster);
}

export async function fetchMasterPackage(id: string): Promise<MasterPackage | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("master_packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapMasterPackage(data as DbMasterPackage);
}

export async function fetchMasters(): Promise<Master[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("masters").select("*").order("created_at");
  if (error) throw error;
  return (data as DbMaster[]).map(mapMaster);
}

export async function updateMasterPricingSupabase(
  masterId: string,
  patch: Pick<
    MasterPricing,
    | "feedbackPrice"
    | "feedbackAdditionalPrice"
    | "phonePrice15Min"
    | "phonePrice30Min"
    | "visitPrice"
    | "visitDurationMin"
    | "feedbackIncludedMin"
    | "feedbackExtraPer5Min"
  >,
): Promise<Master | undefined> {
  const supabase = createClient();
  const current = await fetchMaster(masterId);
  if (!current) return undefined;

  const pricing = {
    ...current.pricing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("masters")
    .update({ pricing })
    .eq("id", masterId)
    .select("*")
    .single();

  if (error) {
    console.error("[eum] updateMasterPricing failed", error);
    throw error;
  }
  if (!data) return undefined;
  return mapMaster(data as DbMaster);
}

export async function updateMasterOffWeekdaysSupabase(
  masterId: string,
  offWeekdays: number[],
): Promise<Master | undefined> {
  return updateMasterScheduleSupabase(masterId, { offWeekdays });
}

export async function updateMasterScheduleSupabase(
  masterId: string,
  patch: { offWeekdays?: number[]; bookingTimes?: string[]; offDates?: string[] },
): Promise<Master | undefined> {
  const supabase = createClient();
  const payload: {
    off_weekdays?: number[];
    booking_times?: string[];
    off_dates?: string[];
  } = {};

  if (patch.offWeekdays) {
    const cleaned = [
      ...new Set(patch.offWeekdays.map((n) => Math.trunc(n)).filter((n) => n >= 0 && n <= 6)),
    ];
    if (cleaned.length === 0 || cleaned.length >= 7) {
      throw new Error("INVALID_OFF_WEEKDAYS");
    }
    payload.off_weekdays = cleaned;
  }

  if (patch.bookingTimes) {
    const cleaned = [
      ...new Set(
        patch.bookingTimes
          .map((t) => t.trim())
          .filter((t) => /^\d{2}:\d{2}$/.test(t)),
      ),
    ].sort();
    if (cleaned.length === 0) {
      throw new Error("INVALID_BOOKING_TIMES");
    }
    payload.booking_times = cleaned;
  }

  if (patch.offDates) {
    const cleaned = [
      ...new Set(
        patch.offDates
          .map((d) => d.trim().slice(0, 10))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
      ),
    ].sort();
    payload.off_dates = cleaned;
  }

  if (Object.keys(payload).length === 0) return fetchMaster(masterId);

  const { data, error } = await supabase
    .from("masters")
    .update(payload)
    .eq("id", masterId)
    .select("*")
    .single();

  if (error) {
    console.error("[eum] updateMasterSchedule failed", error);
    throw error;
  }
  if (!data) return undefined;
  return mapMaster(data as DbMaster);
}

export async function createFeedbackOrderSupabase(input: {
  studentId: string;
  masterId: string;
  priceAtPurchase: number;
  studentMessage: string;
  mediaLabel: string;
  mediaType: "audio" | "video";
  mediaDurationSec?: number;
  extraDurationFee?: number;
  mediaUrl?: string;
  practiceRecordId?: string;
}): Promise<FeedbackOrder> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const studentId = await resolveAuthenticatedStudentId(input.studentId);

  const { data, error } = await supabase
    .from("feedback_orders")
    .insert({
      student_id: studentId,
      master_id: input.masterId,
      status: "paid",
      price_at_purchase: input.priceAtPurchase,
      student_message: input.studentMessage,
      media_label: input.mediaLabel,
      media_type: input.mediaType,
      media_duration_sec: input.mediaDurationSec ?? null,
      extra_duration_fee: input.extraDurationFee ?? null,
      media_url: input.mediaUrl ?? null,
      practice_record_id: input.practiceRecordId ?? null,
      timestamp_comments: [],
      paid_at: now,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("CREATE_ORDER_FAILED");
  return mapFeedbackOrder(data as DbFeedbackOrder);
}

export async function createReservationSupabase(input: {
  studentId: string;
  masterId: string;
  type: "phone" | "visit";
  priceAtPurchase: number;
  durationMin?: number;
  scheduledAt: string;
  preQuestion?: string;
}): Promise<Reservation> {
  const supabase = createClient();
  const studentId = await resolveAuthenticatedStudentId(input.studentId);

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      student_id: studentId,
      master_id: input.masterId,
      type: input.type,
      status: "scheduled",
      price_at_purchase: input.priceAtPurchase,
      duration_min: input.durationMin ?? null,
      scheduled_at: input.scheduledAt,
      pre_question: input.preQuestion ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("CREATE_RESERVATION_FAILED");
  return mapReservation(data as DbReservation);
}

export async function fetchFeedbackOrder(id: string): Promise<FeedbackOrder | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedback_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapFeedbackOrder(data as DbFeedbackOrder);
}

export async function completeFeedbackOrderSupabase(
  orderId: string,
  payload: {
    timestampComments: TimestampComment[];
    masterSummary: string;
    recommendedPackageId?: string;
    replyMediaUrl?: string;
    replyMediaType?: "audio" | "video";
    replyMediaLabel?: string;
  },
): Promise<FeedbackOrder | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedback_orders")
    .update({
      status: "completed",
      timestamp_comments: payload.timestampComments,
      master_summary: payload.masterSummary,
      recommended_package_id: payload.recommendedPackageId ?? null,
      reply_media_url: payload.replyMediaUrl ?? null,
      reply_media_type: payload.replyMediaType ?? null,
      reply_media_label: payload.replyMediaLabel ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error || !data) return undefined;
  return mapFeedbackOrder(data as DbFeedbackOrder);
}

export async function toggleFavoriteSupabase(input: {
  userId: string;
  type: "master" | "academy";
  id: string;
  active: boolean;
}) {
  const supabase = createClient();
  if (input.type === "master") {
    if (input.active) {
      await supabase
        .from("favorite_masters")
        .delete()
        .eq("user_id", input.userId)
        .eq("master_id", input.id);
    } else {
      await supabase.from("favorite_masters").insert({
        user_id: input.userId,
        master_id: input.id,
      });
    }
    return;
  }

  if (input.active) {
    await supabase
      .from("favorite_academies")
      .delete()
      .eq("user_id", input.userId)
      .eq("academy_id", input.id);
  } else {
    await supabase.from("favorite_academies").insert({
      user_id: input.userId,
      academy_id: input.id,
    });
  }
}

export async function createStudentReviewSupabase(input: {
  studentId: string;
  masterId: string;
  productLabel: string;
  rating: number;
  text: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("student_reviews").insert({
    student_id: input.studentId,
    master_id: input.masterId,
    product_label: input.productLabel,
    rating: input.rating,
    text: input.text,
  });
  if (error) throw error;
}

export async function cancelReservationSupabase(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelFeedbackOrderSupabase(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feedback_orders")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

export async function createPracticeRecordSupabase(input: {
  studentId: string;
  title: string;
  memo?: string;
  durationSec: number;
  mediaUrl?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("practice_records")
    .insert({
      student_id: input.studentId,
      title: input.title,
      memo: input.memo ?? null,
      duration_sec: input.durationSec,
      media_url: input.mediaUrl ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("CREATE_PRACTICE_FAILED");

  const { data: student } = await supabase
    .from("students")
    .select("points")
    .eq("id", input.studentId)
    .maybeSingle();
  if (student) {
    await supabase
      .from("students")
      .update({ points: student.points + 300 })
      .eq("id", input.studentId);
  }

  return mapPracticeRecord(data as DbPracticeRecord);
}

export async function markFeedbackInReviewSupabase(orderId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feedback_orders")
    .update({ status: "in_review" })
    .eq("id", orderId)
    .eq("status", "paid");
  if (error) throw error;
}

export async function updateMasterProfileSupabase(
  masterId: string,
  patch: Partial<{
    name: string;
    title: string;
    bio: string;
    tags: string[];
    career: string[];
    phone_number: string;
    response_time_label: string;
    avatar_url: string;
    hero_image_url: string;
  }>,
): Promise<Master | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("masters")
    .update(patch)
    .eq("id", masterId)
    .select("*")
    .single();
  if (error || !data) return undefined;
  return mapMaster(data as DbMaster);
}

export async function createMasterCouponSupabase(input: {
  masterId: string;
  title: string;
  discountAmount: number;
  totalQuantity: number;
}): Promise<MasterCoupon> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("master_coupons")
    .insert({
      master_id: input.masterId,
      title: input.title.trim() || "할인 쿠폰",
      discount_amount: input.discountAmount,
      total_quantity: input.totalQuantity,
      remaining_quantity: input.totalQuantity,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("COUPON_CREATE_FAILED");
  return mapMasterCoupon(data as DbMasterCoupon);
}

export async function deactivateMasterCouponSupabase(couponId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("master_coupons")
    .update({ is_active: false })
    .eq("id", couponId);
  if (error) throw error;
}

export async function claimMasterCouponSupabase(couponId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("claim_master_coupon", {
    p_coupon_id: couponId,
  });
  if (error) throw error;
  return String(data);
}

export async function useStudentCouponClaimSupabase(claimId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("use_student_coupon_claim", {
    p_claim_id: claimId,
  });
  if (error) throw error;
}

export async function createPackagePurchaseSupabase(input: {
  studentId: string;
  masterId: string;
  packageId: string;
  mode: LessonMode;
  priceAtPurchase: number;
  packageTitle: string;
  couponClaimId?: string;
}): Promise<PackagePurchase> {
  const supabase = createClient();
  const studentId = await resolveAuthenticatedStudentId(input.studentId);

  const { data, error } = await supabase
    .from("package_purchases")
    .insert({
      student_id: studentId,
      master_id: input.masterId,
      package_id: input.packageId,
      mode: input.mode,
      price_at_purchase: input.priceAtPurchase,
      package_title: input.packageTitle,
      coupon_claim_id: input.couponClaimId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("PACKAGE_PURCHASE_FAILED");
  return mapPackagePurchase(data as DbPackagePurchase);
}

export async function createMasterPackageSupabase(input: {
  masterId: string;
  level: PackageLevel;
  title: string;
  description?: string;
  coverUrl?: string;
  weeks: PackageWeek[];
  priceVisit: number;
  pricePhone: number;
  priceVideo: number;
}): Promise<MasterPackage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("master_packages")
    .insert({
      master_id: input.masterId,
      level: input.level,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      cover_url: input.coverUrl?.trim() || null,
      weeks: input.weeks,
      price_visit: input.priceVisit,
      price_phone: input.pricePhone,
      price_video: input.priceVideo,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("PACKAGE_CREATE_FAILED");
  return mapMasterPackage(data as DbMasterPackage);
}

export async function deactivateMasterPackageSupabase(packageId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("master_packages")
    .update({ is_active: false })
    .eq("id", packageId);
  if (error) throw error;
}

export async function updateMasterPackageSupabase(
  packageId: string,
  patch: {
    level: PackageLevel;
    title: string;
    description?: string;
    coverUrl?: string;
    weeks: PackageWeek[];
    priceVisit: number;
    pricePhone: number;
    priceVideo: number;
  },
): Promise<MasterPackage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("master_packages")
    .update({
      level: patch.level,
      title: patch.title.trim(),
      description: patch.description?.trim() || null,
      cover_url: patch.coverUrl?.trim() || null,
      weeks: patch.weeks,
      price_visit: patch.priceVisit,
      price_phone: patch.pricePhone,
      price_video: patch.priceVideo,
    })
    .eq("id", packageId)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("PACKAGE_UPDATE_FAILED");
  return mapMasterPackage(data as DbMasterPackage);
}

export async function deleteMasterPackageSupabase(packageId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("master_packages").delete().eq("id", packageId);
  if (error) throw error;
}
