import type { OnboardingPrefs } from "@/lib/auth/session";
import type {
  EumDatabase,
  FeedbackOrder,
  Master,
  MasterCoupon,
  MasterPackage,
  MasterPricing,
  PackageLevel,
  PackageWeek,
  PracticeRecord,
  Reservation,
  Student,
  StudentCouponClaim,
  StudentReview,
  TimestampComment,
  PackagePurchase,
  LessonMode,
  Weekday,
} from "@/lib/db/schema";
import { DEFAULT_BOOKING_TIMES, DEFAULT_OFF_WEEKDAYS } from "@/lib/db/schema";

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeOffWeekdays(raw: number[] | null | undefined): Weekday[] {
  if (!raw?.length) return [...DEFAULT_OFF_WEEKDAYS];
  const cleaned = raw
    .map((n) => Math.trunc(n))
    .filter((n): n is Weekday => n >= 0 && n <= 6);
  // 전부 휴무면 예약 불가 → 기본값으로 폴백
  if (cleaned.length === 0 || cleaned.length >= 7) return [...DEFAULT_OFF_WEEKDAYS];
  return [...new Set(cleaned)] as Weekday[];
}

function normalizeBookingTimes(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [...DEFAULT_BOOKING_TIMES];
  const cleaned = [
    ...new Set(
      raw
        .map((t) => t.trim())
        .filter((t) => TIME_RE.test(t)),
    ),
  ].sort();
  return cleaned.length > 0 ? cleaned : [...DEFAULT_BOOKING_TIMES];
}

function normalizeOffDates(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return [
    ...new Set(raw.map((d) => d.trim().slice(0, 10)).filter((d) => DATE_RE.test(d))),
  ].sort();
}
export type DbProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "student" | "master";
  created_at: string;
  onboarding_prefs?: OnboardingPrefs | null;
};

export type DbStudent = {
  id: string;
  user_id: string;
  points: number;
  created_at: string;
  profiles?: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
};

export type DbMaster = {
  id: string;
  user_id: string | null;
  name: string;
  title: string;
  avatar_url: string;
  hero_image_url: string;
  rating: number;
  review_count: number;
  feedback_count: number;
  response_time_label: string;
  tags: string[];
  bio: string;
  rank_label: string | null;
  career: string[];
  phone_number: string;
  pricing: MasterPricing;
  off_weekdays?: number[] | null;
  booking_times?: string[] | null;
  off_dates?: string[] | null;
  created_at: string;
};

export type DbFeedbackOrder = {
  id: string;
  student_id: string;
  master_id: string;
  status: FeedbackOrder["status"];
  price_at_purchase: number;
  student_message: string;
  media_label: string;
  media_type: "audio" | "video";
  media_duration_sec: number | null;
  extra_duration_fee: number | null;
  media_url: string | null;
  practice_record_id?: string | null;
  timestamp_comments: TimestampComment[];
  master_summary: string | null;
  reply_media_url?: string | null;
  reply_media_type?: "audio" | "video" | null;
  reply_media_label?: string | null;
  recommended_package_id?: string | null;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
};

export type DbReservation = {
  id: string;
  student_id: string;
  master_id: string;
  type: "phone" | "visit";
  status: Reservation["status"];
  price_at_purchase: number;
  duration_min: number | null;
  scheduled_at: string;
  pre_question: string | null;
  created_at: string;
};

export type DbStudentReview = {
  id: string;
  student_id: string;
  master_id: string;
  product_label: string;
  rating: number;
  text: string;
  created_at: string;
};

export type DbPracticeRecord = {
  id: string;
  student_id: string;
  title: string;
  memo: string | null;
  duration_sec: number;
  media_url: string | null;
  created_at: string;
};

export type DbMasterCoupon = {
  id: string;
  master_id: string;
  title: string;
  discount_amount: number;
  total_quantity: number;
  remaining_quantity: number;
  is_active: boolean;
  created_at: string;
};

export type DbStudentCouponClaim = {
  id: string;
  coupon_id: string;
  student_id: string;
  claimed_at: string;
  used_at?: string | null;
};

export type DbMasterPackage = {
  id: string;
  master_id: string;
  level: PackageLevel;
  title: string;
  description: string | null;
  cover_url?: string | null;
  weeks?: PackageWeek[] | null;
  price_visit: number;
  price_phone: number;
  price_video: number;
  is_active: boolean;
  created_at: string;
};

export type DbPackagePurchase = {
  id: string;
  student_id: string;
  master_id: string;
  package_id: string;
  mode: LessonMode;
  price_at_purchase: number;
  package_title: string;
  coupon_claim_id: string | null;
  created_at: string;
};

const DEFAULT_PRICING: MasterPricing = {
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

export function mapMaster(row: DbMaster): Master {
  const pricing = {
    ...DEFAULT_PRICING,
    ...(row.pricing ?? {}),
    feedbackAdditionalPrice:
      row.pricing?.feedbackAdditionalPrice ??
      row.pricing?.feedbackPrice ??
      DEFAULT_PRICING.feedbackAdditionalPrice,
    updatedAt: row.pricing?.updatedAt ?? DEFAULT_PRICING.updatedAt,
  };

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    title: row.title,
    avatarUrl: row.avatar_url,
    heroImageUrl: row.hero_image_url,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    feedbackCount: row.feedback_count,
    responseTimeLabel: row.response_time_label,
    tags: row.tags ?? [],
    bio: row.bio,
    rankLabel: row.rank_label ?? undefined,
    career: row.career ?? [],
    phoneNumber: row.phone_number,
    pricing,
    offWeekdays: normalizeOffWeekdays(row.off_weekdays),
    bookingTimes: normalizeBookingTimes(row.booking_times),
    offDates: normalizeOffDates(row.off_dates),
  };
}

export function mapStudent(row: DbStudent): Student {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    userId: row.user_id,
    name: profile?.name ?? "",
    phone: profile?.phone ?? undefined,
    points: row.points,
  };
}

export function mapFeedbackOrder(row: DbFeedbackOrder): FeedbackOrder {
  return {
    id: row.id,
    studentId: row.student_id,
    masterId: row.master_id,
    status: row.status,
    priceAtPurchase: row.price_at_purchase,
    studentMessage: row.student_message,
    mediaLabel: row.media_label,
    mediaType: row.media_type,
    mediaDurationSec: row.media_duration_sec ?? undefined,
    extraDurationFee: row.extra_duration_fee ?? undefined,
    mediaUrl: row.media_url ?? undefined,
    practiceRecordId: row.practice_record_id ?? undefined,
    timestampComments: (row.timestamp_comments ?? []).map((c) => {
      const raw = c as TimestampComment & { timeSec?: number };
      const time = typeof raw.time === "number" ? raw.time : Number(raw.timeSec ?? 0);
      return { time: Number.isFinite(time) ? time : 0, text: raw.text ?? "" };
    }),
    masterSummary: row.master_summary ?? undefined,
    replyMediaUrl: row.reply_media_url ?? undefined,
    replyMediaType: row.reply_media_type ?? undefined,
    replyMediaLabel: row.reply_media_label ?? undefined,
    recommendedPackageId: row.recommended_package_id ?? undefined,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export function mapReservation(row: DbReservation): Reservation {
  return {
    id: row.id,
    studentId: row.student_id,
    masterId: row.master_id,
    type: row.type,
    status: row.status,
    priceAtPurchase: row.price_at_purchase,
    durationMin: row.duration_min ?? undefined,
    scheduledAt: row.scheduled_at,
    preQuestion: row.pre_question ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapStudentReview(row: DbStudentReview): StudentReview {
  return {
    id: row.id,
    studentId: row.student_id,
    masterId: row.master_id,
    productLabel: row.product_label,
    rating: Number(row.rating),
    text: row.text,
    createdAt: row.created_at,
  };
}

export function mapPracticeRecord(row: DbPracticeRecord): PracticeRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    memo: row.memo ?? undefined,
    durationSec: row.duration_sec,
    mediaUrl: row.media_url ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapMasterCoupon(row: DbMasterCoupon): MasterCoupon {
  return {
    id: row.id,
    masterId: row.master_id,
    title: row.title,
    discountAmount: row.discount_amount,
    totalQuantity: row.total_quantity,
    remainingQuantity: row.remaining_quantity,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapStudentCouponClaim(row: DbStudentCouponClaim): StudentCouponClaim {
  return {
    id: row.id,
    couponId: row.coupon_id,
    studentId: row.student_id,
    claimedAt: row.claimed_at,
    usedAt: row.used_at ?? undefined,
  };
}

export function mapMasterPackage(row: DbMasterPackage): MasterPackage {
  const weeks = (Array.isArray(row.weeks) ? row.weeks : []).map((week, index) => {
    const raw = week as PackageWeek & { desc?: string; durationMin?: number };
    const durationSec =
      raw.durationSec > 0
        ? raw.durationSec
        : raw.durationMin && raw.durationMin > 0
          ? raw.durationMin * 60
          : 0;
    return {
      week: raw.week ?? index + 1,
      title: raw.title || `${index + 1}주차`,
      description: raw.description || raw.desc || undefined,
      videoUrl: raw.videoUrl || undefined,
      durationSec,
    };
  });
  return {
    id: row.id,
    masterId: row.master_id,
    level: row.level,
    title: row.title,
    description: row.description ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    weeks,
    priceVisit: row.price_visit,
    pricePhone: row.price_phone,
    priceVideo: row.price_video,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapPackagePurchase(row: DbPackagePurchase): PackagePurchase {
  return {
    id: row.id,
    studentId: row.student_id,
    masterId: row.master_id,
    packageId: row.package_id,
    mode: row.mode,
    priceAtPurchase: row.price_at_purchase,
    packageTitle: row.package_title,
    couponClaimId: row.coupon_claim_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapDatabase(input: {
  masters: DbMaster[];
  students: DbStudent[];
  feedbackOrders: DbFeedbackOrder[];
  reservations: DbReservation[];
  practiceRecords: DbPracticeRecord[];
  favoriteMasterIds: string[];
  favoriteAcademyIds: string[];
  studentReviews: DbStudentReview[];
  masterCoupons?: DbMasterCoupon[];
  studentCouponClaims?: DbStudentCouponClaim[];
  masterPackages?: DbMasterPackage[];
  packagePurchases?: DbPackagePurchase[];
}): EumDatabase {
  return {
    masters: input.masters.map(mapMaster),
    students: input.students.map(mapStudent),
    feedbackOrders: input.feedbackOrders.map(mapFeedbackOrder),
    reservations: input.reservations.map(mapReservation),
    practiceRecords: input.practiceRecords.map(mapPracticeRecord),
    favoriteMasterIds: input.favoriteMasterIds,
    favoriteAcademyIds: input.favoriteAcademyIds,
    studentReviews: input.studentReviews.map(mapStudentReview),
    masterCoupons: (input.masterCoupons ?? []).map(mapMasterCoupon),
    studentCouponClaims: (input.studentCouponClaims ?? []).map(mapStudentCouponClaim),
    masterPackages: (input.masterPackages ?? []).map(mapMasterPackage),
    packagePurchases: (input.packagePurchases ?? []).map(mapPackagePurchase),
  };
}
