import type {
  EumDatabase,
  FeedbackOrder,
  Master,
  MasterPricing,
  Reservation,
  TimestampComment,
} from "./schema";
import { SEED_DB } from "./seed";

const STORAGE_KEY = "eum_db_v1";

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
  };

  return {
    ...(seed ?? stored),
    ...stored,
    tags: stored.tags ?? seed?.tags ?? [],
    career: stored.career ?? seed?.career ?? [],
    rankLabel: stored.rankLabel ?? seed?.rankLabel,
    phoneNumber: stored.phoneNumber ?? seed?.phoneNumber ?? "",
    pricing,
  };
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
    | "phonePrice15Min"
    | "phonePrice30Min"
    | "visitPrice"
    | "visitDurationMin"
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
  payload: { timestampComments: TimestampComment[]; masterSummary: string },
): FeedbackOrder | undefined {
  const db = loadDb();
  const order = db.feedbackOrders.find((o) => o.id === orderId);
  if (!order) return undefined;
  order.status = "completed";
  order.timestampComments = payload.timestampComments;
  order.masterSummary = payload.masterSummary;
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
    Pick<Master, "name" | "title" | "bio" | "tags" | "career" | "phoneNumber" | "responseTimeLabel">
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
