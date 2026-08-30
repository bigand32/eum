import type {
  EumDatabase,
  FeedbackOrder,
  Master,
  MasterPricing,
  PracticeRecord,
  Reservation,
  Student,
  StudentReview,
  TimestampComment,
} from "@/lib/db/schema";

export type DbProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "student" | "master";
  created_at: string;
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
  timestamp_comments: TimestampComment[];
  master_summary: string | null;
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
  duration_sec: number;
  media_url: string | null;
  created_at: string;
};

const DEFAULT_PRICING: MasterPricing = {
  feedbackPrice: 20000,
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
    updatedAt: row.pricing?.updatedAt ?? DEFAULT_PRICING.updatedAt,
  };

  return {
    id: row.id,
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
  };
}

export function mapStudent(row: DbStudent): Student {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
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
    timestampComments: row.timestamp_comments ?? [],
    masterSummary: row.master_summary ?? undefined,
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
    durationSec: row.duration_sec,
    mediaUrl: row.media_url ?? undefined,
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
  };
}
