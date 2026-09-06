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
  PracticeRecord,
  Reservation,
  TimestampComment,
  Weekday,
} from "./schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  cancelFeedbackOrderSupabase,
  cancelReservationSupabase,
  claimMasterCouponSupabase,
  completeFeedbackOrderSupabase,
  createFeedbackOrderSupabase,
  createMasterCouponSupabase,
  createMasterPackageSupabase,
  createPackagePurchaseSupabase,
  createPracticeRecordSupabase,
  createReservationSupabase,
  createStudentReviewSupabase,
  deactivateMasterCouponSupabase,
  deactivateMasterPackageSupabase,
  deleteMasterPackageSupabase,
  ensureMasterProfileSupabase,
  fetchDb,
  fetchFeedbackOrder,
  fetchMaster,
  fetchMasterPackage,
  markFeedbackInReviewSupabase,
  toggleFavoriteSupabase,
  updateMasterPackageSupabase,
  updateMasterPricingSupabase,
  updateMasterOffWeekdaysSupabase,
  updateMasterScheduleSupabase,
  updateMasterProfileSupabase,
  useStudentCouponClaimSupabase,
} from "./supabase-store";
import {
  cancelFeedbackOrderLocal,
  cancelReservationLocal,
  completeFeedbackOrder as completeFeedbackOrderLocal,
  createFeedbackOrder as createFeedbackOrderLocal,
  createMasterPackageLocal,
  createPackagePurchaseLocal,
  createPracticeRecordLocal,
  createReservation as createReservationLocal,
  createStudentReviewLocal,
  deactivateMasterPackageLocal,
  deleteMasterPackageLocal,
  getDb as getDbLocal,
  getFeedbackOrder as getFeedbackOrderLocal,
  getMaster as getMasterLocal,
  markFeedbackInReviewLocal,
  toggleFavoriteAcademyLocal,
  toggleFavoriteMasterLocal,
  updateMasterPackageLocal,
  updateMasterPricing as updateMasterPricingLocal,
  updateMasterScheduleLocal,
  updateMasterProfileLocal,
} from "./store";

function notifyDbUpdated() {
  invalidateDbCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("eum-db-updated"));
    try {
      const bc = new BroadcastChannel("eum-db");
      bc.postMessage({ type: "db-updated", at: Date.now() });
      bc.close();
    } catch {
      // BroadcastChannel 미지원 환경은 무시
    }
  }
}

const DB_CACHE_MS = 30_000;
let dbCache: { userId?: string; data: EumDatabase; at: number } | null = null;

export function invalidateDbCache() {
  dbCache = null;
}

export async function loadDb(userId?: string, options?: { force?: boolean }): Promise<EumDatabase> {
  if (isSupabaseConfigured()) {
    if (
      !options?.force &&
      dbCache &&
      dbCache.userId === userId &&
      Date.now() - dbCache.at < DB_CACHE_MS
    ) {
      return dbCache.data;
    }
    // 계정 전환 직후 빈/이전 캐시가 남지 않도록 userId가 바뀌면 무조건 재조회
    if (dbCache && dbCache.userId !== userId) {
      dbCache = null;
    }
    const data = await fetchDb(userId);
    dbCache = { userId, data, at: Date.now() };
    return data;
  }
  return getDbLocal();
}

export async function loadMaster(id: string): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    return fetchMaster(id);
  }
  return getMasterLocal(id);
}

export async function loadMasterPackage(id: string): Promise<MasterPackage | undefined> {
  if (isSupabaseConfigured()) {
    return fetchMasterPackage(id);
  }
  return getDbLocal().masterPackages.find((p) => p.id === id);
}

export async function saveMasterPricing(
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
  if (isSupabaseConfigured()) {
    const master = await updateMasterPricingSupabase(masterId, patch);
    if (master) notifyDbUpdated();
    return master;
  }
  return updateMasterPricingLocal(masterId, patch);
}

export async function saveMasterOffWeekdays(
  masterId: string,
  offWeekdays: Weekday[],
): Promise<Master | undefined> {
  return saveMasterSchedule(masterId, { offWeekdays });
}

export async function saveMasterSchedule(
  masterId: string,
  patch: { offWeekdays?: Weekday[]; bookingTimes?: string[]; offDates?: string[] },
): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    const master = await updateMasterScheduleSupabase(masterId, patch);
    if (master) notifyDbUpdated();
    return master;
  }
  return updateMasterScheduleLocal(masterId, patch);
}

/** 닉네임(학생 이름 / 마스터 활동명) 중복 여부. true면 사용 가능. */
export async function checkNicknameAvailable(
  nickname: string,
  kind: "student" | "master_title",
  excludeId?: string,
): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("is_nickname_available", {
      p_nickname: trimmed,
      p_kind: kind,
      p_exclude_id: excludeId ?? null,
    });
    if (error) {
      // RPC 미적용 환경: 마스터 활동명은 public read로 폴백
      if (kind === "master_title") {
        let query = supabase.from("masters").select("id").ilike("title", trimmed);
        if (excludeId) query = query.neq("id", excludeId);
        const { data: rows, error: qErr } = await query.limit(1);
        if (qErr) throw qErr;
        return !rows?.length;
      }
      throw error;
    }
    return Boolean(data);
  }

  const db = getDbLocal();
  if (kind === "master_title") {
    return !db.masters.some(
      (m) =>
        m.title.trim().toLowerCase() === trimmed.toLowerCase() &&
        m.id !== excludeId,
    );
  }
  return !db.students.some(
    (s) =>
      s.name.trim().toLowerCase() === trimmed.toLowerCase() &&
      s.id !== excludeId &&
      s.userId !== excludeId,
  );
}

export async function saveFeedbackOrder(input: {
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
  if (isSupabaseConfigured()) {
    const order = await createFeedbackOrderSupabase(input);
    notifyDbUpdated();
    return order;
  }
  return createFeedbackOrderLocal(input);
}

export async function saveReservation(input: {
  studentId: string;
  masterId: string;
  type: "phone" | "visit";
  priceAtPurchase: number;
  durationMin?: number;
  scheduledAt: string;
  preQuestion?: string;
}): Promise<Reservation> {
  if (isSupabaseConfigured()) {
    const reservation = await createReservationSupabase(input);
    notifyDbUpdated();
    return reservation;
  }
  return createReservationLocal(input);
}

export async function loadFeedbackOrder(id: string): Promise<FeedbackOrder | undefined> {
  if (isSupabaseConfigured()) {
    return fetchFeedbackOrder(id);
  }
  return getFeedbackOrderLocal(id);
}

export async function saveCompletedFeedbackOrder(
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
  if (isSupabaseConfigured()) {
    const order = await completeFeedbackOrderSupabase(orderId, payload);
    notifyDbUpdated();
    return order;
  }
  return completeFeedbackOrderLocal(orderId, payload);
}

export async function toggleFavorite(input: {
  userId: string;
  type: "master" | "academy";
  id: string;
  active: boolean;
}) {
  if (isSupabaseConfigured()) {
    await toggleFavoriteSupabase(input);
  } else if (input.type === "master") {
    toggleFavoriteMasterLocal(input.id, input.active);
  } else {
    toggleFavoriteAcademyLocal(input.id, input.active);
  }
  notifyDbUpdated();
}

export async function saveStudentReview(input: {
  studentId: string;
  masterId: string;
  productLabel: string;
  rating: number;
  text: string;
}) {
  if (isSupabaseConfigured()) {
    await createStudentReviewSupabase(input);
  } else {
    createStudentReviewLocal(input);
  }
  notifyDbUpdated();
}

export async function cancelReservation(id: string) {
  if (isSupabaseConfigured()) {
    await cancelReservationSupabase(id);
  } else {
    cancelReservationLocal(id);
  }
  notifyDbUpdated();
}

export async function cancelFeedbackOrder(id: string) {
  if (isSupabaseConfigured()) {
    await cancelFeedbackOrderSupabase(id);
  } else {
    cancelFeedbackOrderLocal(id);
  }
  notifyDbUpdated();
}

export async function savePracticeRecord(input: {
  studentId: string;
  title: string;
  memo?: string;
  durationSec: number;
  mediaUrl?: string;
}): Promise<PracticeRecord> {
  if (isSupabaseConfigured()) {
    const record = await createPracticeRecordSupabase(input);
    notifyDbUpdated();
    return record;
  }
  return createPracticeRecordLocal(input);
}

export async function markFeedbackInReview(orderId: string) {
  if (isSupabaseConfigured()) {
    await markFeedbackInReviewSupabase(orderId);
  } else {
    markFeedbackInReviewLocal(orderId);
  }
  notifyDbUpdated();
}

export async function ensureMasterProfile(input: {
  name: string;
  phone?: string;
}): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    const master = await ensureMasterProfileSupabase(input);
    notifyDbUpdated();
    return master;
  }
  return undefined;
}

export async function saveMasterProfile(
  masterId: string,
  patch: Partial<
    Pick<
      Master,
      | "name"
      | "title"
      | "bio"
      | "tags"
      | "career"
      | "phoneNumber"
      | "responseTimeLabel"
      | "avatarUrl"
      | "heroImageUrl"
    >
  >,
): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    const master = await updateMasterProfileSupabase(masterId, {
      name: patch.name,
      title: patch.title,
      bio: patch.bio,
      tags: patch.tags,
      career: patch.career,
      phone_number: patch.phoneNumber,
      response_time_label: patch.responseTimeLabel,
      avatar_url: patch.avatarUrl,
      hero_image_url: patch.heroImageUrl,
    });
    notifyDbUpdated();
    return master;
  }
  const master = updateMasterProfileLocal(masterId, patch);
  notifyDbUpdated();
  return master;
}

export async function createMasterCoupon(input: {
  masterId: string;
  title: string;
  discountAmount: number;
  totalQuantity: number;
}): Promise<MasterCoupon | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const coupon = await createMasterCouponSupabase(input);
  notifyDbUpdated();
  return coupon;
}

export async function deactivateMasterCoupon(couponId: string) {
  if (!isSupabaseConfigured()) return;
  await deactivateMasterCouponSupabase(couponId);
  notifyDbUpdated();
}

export async function claimMasterCoupon(couponId: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_REQUIRED");
  }
  const claimId = await claimMasterCouponSupabase(couponId);
  notifyDbUpdated();
  return claimId;
}

export async function useStudentCouponClaim(claimId: string) {
  if (!isSupabaseConfigured()) return;
  await useStudentCouponClaimSupabase(claimId);
  notifyDbUpdated();
}

export async function savePackagePurchase(input: {
  studentId: string;
  masterId: string;
  packageId: string;
  mode: LessonMode;
  priceAtPurchase: number;
  packageTitle: string;
  couponClaimId?: string;
}): Promise<PackagePurchase> {
  if (isSupabaseConfigured()) {
    const purchase = await createPackagePurchaseSupabase(input);
    notifyDbUpdated();
    return purchase;
  }
  const purchase = createPackagePurchaseLocal(input);
  notifyDbUpdated();
  return purchase;
}

export async function createMasterPackage(input: {
  masterId: string;
  level: PackageLevel;
  title: string;
  description?: string;
  coverUrl?: string;
  weeks: PackageWeek[];
  priceVisit: number;
  pricePhone: number;
  priceVideo: number;
}): Promise<MasterPackage | undefined> {
  if (isSupabaseConfigured()) {
    const pkg = await createMasterPackageSupabase(input);
    notifyDbUpdated();
    return pkg;
  }
  const pkg = createMasterPackageLocal(input);
  notifyDbUpdated();
  return pkg;
}

export async function deactivateMasterPackage(packageId: string) {
  if (isSupabaseConfigured()) {
    await deactivateMasterPackageSupabase(packageId);
  } else {
    deactivateMasterPackageLocal(packageId);
  }
  notifyDbUpdated();
}

export async function updateMasterPackage(
  packageId: string,
  input: {
    level: PackageLevel;
    title: string;
    description?: string;
    coverUrl?: string;
    weeks: PackageWeek[];
    priceVisit: number;
    pricePhone: number;
    priceVideo: number;
  },
): Promise<MasterPackage | undefined> {
  if (isSupabaseConfigured()) {
    const pkg = await updateMasterPackageSupabase(packageId, input);
    notifyDbUpdated();
    return pkg;
  }
  const pkg = updateMasterPackageLocal(packageId, input);
  notifyDbUpdated();
  return pkg;
}

export async function deleteMasterPackage(packageId: string) {
  if (isSupabaseConfigured()) {
    await deleteMasterPackageSupabase(packageId);
  } else {
    deleteMasterPackageLocal(packageId);
  }
  notifyDbUpdated();
}
