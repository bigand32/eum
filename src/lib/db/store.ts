import type {
  EumDatabase,
  FeedbackOrder,
  LessonMode,
  Master,
  MasterPackage,
  MasterPricing,
  PackageLevel,
  PackagePurchase,
  PackageWeek,
  Reservation,
  TimestampComment,
  Weekday,
} from "./schema";
import { DEFAULT_BOOKING_TIMES, DEFAULT_OFF_WEEKDAYS } from "./schema";
import { SEED_DB } from "./seed";

const STORAGE_KEY = "eum_db_v1";
const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Supabase 미설정 시에만 사용하는 로컬 데모 저장소 */

function normalizeMaster(stored: Master, seed?: Master): Master {
  const legacy = stored.pricing as MasterPricing & {
    phonePrice?: number;
  };
  const phonePrice30Min =
    legacy.phonePrice30Min ?? legacy.phonePrice ?? seed?.pricing.phonePrice30Min ?? 30000;
  const phonePrice15Min =
    legacy.phonePrice15Min ??
    seed?.pricing.phonePrice15Min ??
    Math.round(phonePrice30Min * 0.6);

  const pricing: MasterPricing = {
    ...(seed?.pricing ?? stored.pricing),
    ...stored.pricing,
    phonePrice15Min,
    phonePrice30Min,
    feedbackIncludedMin:
      stored.pricing?.feedbackIncludedMin ?? seed?.pricing.feedbackIncludedMin ?? 5,
    feedbackExtraPer5Min:
      stored.pricing?.feedbackExtraPer5Min ??
      (stored.pricing as { feedbackExtraPerMinute?: number } | undefined)?.feedbackExtraPerMinute ??
      seed?.pricing.feedbackExtraPer5Min ??
      2000,
    feedbackAdditionalPrice:
      stored.pricing?.feedbackAdditionalPrice ??
      seed?.pricing.feedbackAdditionalPrice ??
      stored.pricing?.feedbackPrice ??
      seed?.pricing.feedbackPrice ??
      69000,
  };

  return {
    ...(seed ?? stored),
    ...stored,
    tags: stored.tags ?? seed?.tags ?? [],
    career: stored.career ?? seed?.career ?? [],
    rankLabel: stored.rankLabel ?? seed?.rankLabel,
    phoneNumber: stored.phoneNumber ?? seed?.phoneNumber ?? "",
    pricing,
    offWeekdays: normalizeLocalOffWeekdays(
      stored.offWeekdays ?? seed?.offWeekdays,
    ),
    bookingTimes: normalizeLocalBookingTimes(
      stored.bookingTimes ?? seed?.bookingTimes,
    ),
    offDates: normalizeLocalOffDates(stored.offDates ?? seed?.offDates),
  };
}

function normalizeLocalOffWeekdays(raw: Weekday[] | number[] | undefined): Weekday[] {
  if (!raw?.length) return [...DEFAULT_OFF_WEEKDAYS];
  const cleaned = raw
    .map((n) => Math.trunc(n))
    .filter((n): n is Weekday => n >= 0 && n <= 6);
  if (cleaned.length === 0 || cleaned.length >= 7) return [...DEFAULT_OFF_WEEKDAYS];
  return [...new Set(cleaned)] as Weekday[];
}

function normalizeLocalBookingTimes(raw: string[] | undefined): string[] {
  if (!raw?.length) return [...DEFAULT_BOOKING_TIMES];
  const cleaned = [
    ...new Set(raw.map((t) => t.trim()).filter((t) => TIME_RE.test(t))),
  ].sort();
  return cleaned.length > 0 ? cleaned : [...DEFAULT_BOOKING_TIMES];
}

function normalizeLocalOffDates(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  return [
    ...new Set(raw.map((d) => d.trim().slice(0, 10)).filter((d) => DATE_RE.test(d))),
  ].sort();
}

function normalizeDb(db: EumDatabase): EumDatabase {
  const knownIds = new Set(db.masters.map((m) => m.id));
  const mergedMasters = [
    ...db.masters.map((m) => normalizeMaster(m, SEED_DB.masters.find((s) => s.id === m.id))),
    ...SEED_DB.masters.filter((s) => !knownIds.has(s.id)),
  ];

  const reservations = db.reservations.map((r) => ({
    ...r,
    durationMin:
      r.durationMin ?? (r.type === "phone" ? 30 : undefined),
  }));

  return {
    ...db,
    masters: mergedMasters,
    reservations,
    favoriteMasterIds: db.favoriteMasterIds?.length
      ? db.favoriteMasterIds
      : SEED_DB.favoriteMasterIds,
    favoriteAcademyIds: db.favoriteAcademyIds?.length
      ? db.favoriteAcademyIds
      : SEED_DB.favoriteAcademyIds,
    studentReviews: db.studentReviews?.length ? db.studentReviews : SEED_DB.studentReviews,
    practiceRecords: db.practiceRecords ?? SEED_DB.practiceRecords ?? [],
    masterCoupons: db.masterCoupons ?? SEED_DB.masterCoupons ?? [],
    studentCouponClaims: db.studentCouponClaims ?? SEED_DB.studentCouponClaims ?? [],
    masterPackages: db.masterPackages ?? SEED_DB.masterPackages ?? [],
    packagePurchases: db.packagePurchases ?? SEED_DB.packagePurchases ?? [],
  };
}

function loadDb(): EumDatabase {
  if (typeof window === "undefined") return SEED_DB;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DB));
      return structuredClone(SEED_DB);
    }
    const normalized = normalizeDb(JSON.parse(raw) as EumDatabase);
    return normalized;
  } catch {
    return structuredClone(SEED_DB);
  }
}

function saveDb(db: EumDatabase) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("eum-db-updated"));
  try {
    const bc = new BroadcastChannel("eum-db");
    bc.postMessage({ type: "db-updated", at: Date.now() });
    bc.close();
  } catch {
    // ignore
  }
}

export function getDb(): EumDatabase {
  return loadDb();
}

export function getMasters(): Master[] {
  return loadDb().masters;
}

export function getMaster(id: string): Master | undefined {
  return loadDb().masters.find((m) => m.id === id);
}

export function updateMasterPricing(
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
): Master | undefined {
  const db = loadDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return undefined;
  master.pricing = {
    ...master.pricing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db);
  return master;
}

export function updateMasterOffWeekdaysLocal(
  masterId: string,
  offWeekdays: Weekday[],
): Master | undefined {
  const db = loadDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return undefined;
  master.offWeekdays = normalizeLocalOffWeekdays(offWeekdays);
  saveDb(db);
  return master;
}

export function updateMasterBookingTimesLocal(
  masterId: string,
  bookingTimes: string[],
): Master | undefined {
  const db = loadDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return undefined;
  master.bookingTimes = normalizeLocalBookingTimes(bookingTimes);
  saveDb(db);
  return master;
}

export function updateMasterScheduleLocal(
  masterId: string,
  patch: { offWeekdays?: Weekday[]; bookingTimes?: string[]; offDates?: string[] },
): Master | undefined {
  const db = loadDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return undefined;
  if (patch.offWeekdays) {
    master.offWeekdays = normalizeLocalOffWeekdays(patch.offWeekdays);
  }
  if (patch.bookingTimes) {
    master.bookingTimes = normalizeLocalBookingTimes(patch.bookingTimes);
  }
  if (patch.offDates) {
    master.offDates = normalizeLocalOffDates(patch.offDates);
  }
  saveDb(db);
  return master;
}

export function createFeedbackOrder(input: {
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
}): FeedbackOrder {
  const db = loadDb();
  const order: FeedbackOrder = {
    id: `order-${Date.now()}`,
    status: "paid",
    timestampComments: [],
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    ...input,
  };
  db.feedbackOrders.unshift(order);
  saveDb(db);
  return order;
}

export function createReservation(input: {
  studentId: string;
  masterId: string;
  type: "phone" | "visit";
  priceAtPurchase: number;
  durationMin?: number;
  scheduledAt: string;
  preQuestion?: string;
}): Reservation {
  const db = loadDb();
  const reservation: Reservation = {
    id: `res-${Date.now()}`,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.reservations.unshift(reservation);
  saveDb(db);
  return reservation;
}

export function createPackagePurchaseLocal(input: {
  studentId: string;
  masterId: string;
  packageId: string;
  mode: LessonMode;
  priceAtPurchase: number;
  packageTitle: string;
  couponClaimId?: string;
}): PackagePurchase {
  const db = loadDb();
  const purchase: PackagePurchase = {
    id: `pkg-buy-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.packagePurchases.unshift(purchase);
  if (input.couponClaimId) {
    const claim = db.studentCouponClaims.find((c) => c.id === input.couponClaimId);
    if (claim) claim.usedAt = new Date().toISOString();
  }
  saveDb(db);
  return purchase;
}

export function getFeedbackOrder(id: string): FeedbackOrder | undefined {
  return loadDb().feedbackOrders.find((o) => o.id === id);
}

export function getFeedbackOrdersForStudent(studentId: string): FeedbackOrder[] {
  return loadDb().feedbackOrders.filter((o) => o.studentId === studentId);
}

export function getFeedbackOrdersForMaster(masterId: string): FeedbackOrder[] {
  return loadDb().feedbackOrders.filter((o) => o.masterId === masterId);
}

export function completeFeedbackOrder(
  orderId: string,
  payload: {
    timestampComments: TimestampComment[];
    masterSummary: string;
    recommendedPackageId?: string;
    replyMediaUrl?: string;
    replyMediaType?: "audio" | "video";
    replyMediaLabel?: string;
  },
): FeedbackOrder | undefined {
  const db = loadDb();
  const order = db.feedbackOrders.find((o) => o.id === orderId);
  if (!order) return undefined;
  order.status = "completed";
  order.timestampComments = payload.timestampComments;
  order.masterSummary = payload.masterSummary;
  order.recommendedPackageId = payload.recommendedPackageId;
  order.replyMediaUrl = payload.replyMediaUrl;
  order.replyMediaType = payload.replyMediaType;
  order.replyMediaLabel = payload.replyMediaLabel;
  order.completedAt = new Date().toISOString();
  saveDb(db);
  return order;
}

export function markFeedbackInReviewLocal(orderId: string): FeedbackOrder | undefined {
  const db = loadDb();
  const order = db.feedbackOrders.find((o) => o.id === orderId);
  if (!order || order.status !== "paid") return undefined;
  order.status = "in_review";
  saveDb(db);
  return order;
}

export function updateMasterProfileLocal(
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
): Master | undefined {
  const db = loadDb();
  const master = db.masters.find((m) => m.id === masterId);
  if (!master) return undefined;
  Object.assign(master, patch);
  saveDb(db);
  return master;
}

export function getReservationsForStudent(studentId: string): Reservation[] {
  return loadDb().reservations.filter((r) => r.studentId === studentId);
}

export function resetDbToSeed() {
  saveDb(structuredClone(SEED_DB));
}

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

export function registerStudent(input: { name: string; phone: string }) {
  const db = loadDb();
  const student = {
    id: `student-${Date.now()}`,
    name: input.name,
    phone: input.phone,
    points: 0,
  };
  db.students.push(student);
  saveDb(db);
  return student;
}

export function registerMaster(input: {
  name: string;
  phoneNumber: string;
  title: string;
  bio: string;
  career: string[];
  tags: string[];
  avatarUrl: string;
  heroImageUrl: string;
}): Master {
  const db = loadDb();
  const master: Master = {
    id: `master-${Date.now()}`,
    name: input.name,
    title: input.title,
    avatarUrl: input.avatarUrl,
    heroImageUrl: input.heroImageUrl,
    rating: 0,
    reviewCount: 0,
    feedbackCount: 0,
    responseTimeLabel: "1시간",
    tags: input.tags,
    bio: input.bio,
    career: input.career,
    phoneNumber: input.phoneNumber,
    pricing: { ...DEFAULT_MASTER_PRICING, updatedAt: new Date().toISOString() },
    offWeekdays: [...DEFAULT_OFF_WEEKDAYS],
    bookingTimes: [...DEFAULT_BOOKING_TIMES],
    offDates: [],
  };
  db.masters.push(master);
  saveDb(db);
  return master;
}

export function toggleFavoriteMasterLocal(masterId: string, active: boolean) {
  const db = loadDb();
  if (active) {
    db.favoriteMasterIds = db.favoriteMasterIds.filter((id) => id !== masterId);
  } else if (!db.favoriteMasterIds.includes(masterId)) {
    db.favoriteMasterIds.push(masterId);
  }
  saveDb(db);
}

export function toggleFavoriteAcademyLocal(academyId: string, active: boolean) {
  const db = loadDb();
  if (active) {
    db.favoriteAcademyIds = db.favoriteAcademyIds.filter((id) => id !== academyId);
  } else if (!db.favoriteAcademyIds.includes(academyId)) {
    db.favoriteAcademyIds.push(academyId);
  }
  saveDb(db);
}

export function createStudentReviewLocal(input: {
  studentId: string;
  masterId: string;
  productLabel: string;
  rating: number;
  text: string;
}) {
  const db = loadDb();
  const review = {
    id: `review-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.studentReviews.unshift(review);
  saveDb(db);
  return review;
}

export function cancelReservationLocal(id: string): Reservation | undefined {
  const db = loadDb();
  const reservation = db.reservations.find((r) => r.id === id);
  if (!reservation || reservation.status !== "scheduled") return undefined;
  reservation.status = "cancelled";
  saveDb(db);
  return reservation;
}

export function cancelFeedbackOrderLocal(id: string): FeedbackOrder | undefined {
  const db = loadDb();
  const order = db.feedbackOrders.find((o) => o.id === id);
  if (!order || order.status === "completed" || order.status === "cancelled") return undefined;
  order.status = "cancelled";
  saveDb(db);
  return order;
}

export function createPracticeRecordLocal(input: {
  studentId: string;
  title: string;
  memo?: string;
  durationSec: number;
  mediaUrl?: string;
}) {
  const db = loadDb();
  const record = {
    id: `practice-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.practiceRecords.unshift(record);
  const student = db.students.find((s) => s.id === input.studentId);
  if (student) student.points += 300;
  saveDb(db);
  return record;
}

export function createMasterPackageLocal(input: {
  masterId: string;
  level: PackageLevel;
  title: string;
  description?: string;
  coverUrl?: string;
  weeks: PackageWeek[];
  priceVisit: number;
  pricePhone: number;
  priceVideo: number;
}): MasterPackage {
  const db = loadDb();
  const pkg: MasterPackage = {
    id: `pkg-${Date.now()}`,
    masterId: input.masterId,
    level: input.level,
    title: input.title,
    description: input.description,
    coverUrl: input.coverUrl,
    weeks: input.weeks,
    priceVisit: input.priceVisit,
    pricePhone: input.pricePhone,
    priceVideo: input.priceVideo,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.masterPackages.unshift(pkg);
  saveDb(db);
  return pkg;
}

export function deactivateMasterPackageLocal(packageId: string): void {
  const db = loadDb();
  const pkg = db.masterPackages.find((p) => p.id === packageId);
  if (!pkg) return;
  pkg.isActive = false;
  saveDb(db);
}

export function updateMasterPackageLocal(
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
): MasterPackage | undefined {
  const db = loadDb();
  const pkg = db.masterPackages.find((p) => p.id === packageId);
  if (!pkg) return undefined;
  Object.assign(pkg, {
    level: patch.level,
    title: patch.title,
    description: patch.description,
    coverUrl: patch.coverUrl,
    weeks: patch.weeks,
    priceVisit: patch.priceVisit,
    pricePhone: patch.pricePhone,
    priceVideo: patch.priceVideo,
  });
  saveDb(db);
  return pkg;
}

export function deleteMasterPackageLocal(packageId: string): void {
  const db = loadDb();
  db.masterPackages = db.masterPackages.filter((p) => p.id !== packageId);
  saveDb(db);
}
