/** 상품 유형 */
export type ProductType = "feedback" | "phone" | "visit";

/** 비동기 피드백 주문 상태 */
export type FeedbackOrderStatus =
  | "pending_payment"
  | "paid"
  | "in_review"
  | "completed"
  | "cancelled";

/** 예약(전화·방문) 상태 */
export type ReservationStatus = "scheduled" | "completed" | "cancelled";

export type TimestampComment = {
  time: number;
  text: string;
};

/** 강사 현재 요금 — 언제든 수정 가능 */
export type MasterPricing = {
  feedbackPrice: number;
  phonePrice15Min: number;
  phonePrice30Min: number;
  visitPrice: number;
  visitDurationMin: number;
  feedbackIncludedMin: number;
  feedbackExtraPer5Min: number;
  updatedAt: string;
};

export type Master = {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  heroImageUrl: string;
  rating: number;
  reviewCount: number;
  feedbackCount: number;
  responseTimeLabel: string;
  tags: string[];
  bio: string;
  rankLabel?: string;
  career: string[];
  phoneNumber: string;
  pricing: MasterPricing;
};

export type Student = {
  id: string;
  name: string;
  phone?: string;
  points: number;
};

export type StudentReview = {
  id: string;
  studentId: string;
  masterId: string;
  productLabel: string;
  rating: number;
  text: string;
  createdAt: string;
};

/**
 * 피드백 주문
 * priceAtPurchase: 결제 시점 스냅샷 (강사 요금 변경 후에도 유지)
 */
export type FeedbackOrder = {
  id: string;
  studentId: string;
  masterId: string;
  status: FeedbackOrderStatus;
  priceAtPurchase: number;
  studentMessage: string;
  mediaLabel: string;
  mediaType: "audio" | "video";
  mediaDurationSec?: number;
  extraDurationFee?: number;
  mediaUrl?: string;
  timestampComments: TimestampComment[];
  masterSummary?: string;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
};

/**
 * 전화·방문 예약
 */
export type Reservation = {
  id: string;
  studentId: string;
  masterId: string;
  type: "phone" | "visit";
  status: ReservationStatus;
  priceAtPurchase: number;
  durationMin?: number;
  scheduledAt: string;
  preQuestion?: string;
  createdAt: string;
};

export type PracticeRecord = {
  id: string;
  studentId: string;
  title: string;
  durationSec: number;
  mediaUrl?: string;
  createdAt: string;
};

export type EumDatabase = {
  masters: Master[];
  students: Student[];
  feedbackOrders: FeedbackOrder[];
  reservations: Reservation[];
  practiceRecords: PracticeRecord[];
  favoriteMasterIds: string[];
  favoriteAcademyIds: string[];
  studentReviews: StudentReview[];
};

export const EMPTY_DB: EumDatabase = {
  masters: [],
  students: [],
  feedbackOrders: [],
  reservations: [],
  practiceRecords: [],
  favoriteMasterIds: [],
  favoriteAcademyIds: [],
  studentReviews: [],
};

export const DEMO_STUDENT_ID = "student-1";
export const DEMO_MASTER_ID = "master-1";

export function formatPrice(won: number) {
  return won.toLocaleString("ko-KR");
}
