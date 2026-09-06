/** 상품 유형 */
export type ProductType = "feedback" | "phone" | "visit" | "video" | "package";

/** 커리큘럼 레벨 */
export type PackageLevel = "beginner" | "intermediate" | "master";

/** 수업 방식 */
export type LessonMode = "visit" | "phone" | "video";

export type PackageWeek = {
  week: number;
  title: string;
  description?: string;
  videoUrl?: string;
  /** 영상 길이(초). 업로드 시 자동 측정 */
  durationSec: number;
};

/** 마스터 커리큘럼 패키지 */
export type MasterPackage = {
  id: string;
  masterId: string;
  level: PackageLevel;
  title: string;
  description?: string;
  /** 강의 카드 썸네일 (강사 업로드) */
  coverUrl?: string;
  weeks: PackageWeek[];
  priceVisit: number;
  pricePhone: number;
  priceVideo: number;
  isActive: boolean;
  createdAt: string;
};

export const PACKAGE_LEVEL_LABEL: Record<PackageLevel, string> = {
  beginner: "초급",
  intermediate: "중급",
  master: "마스터",
};

export const LESSON_MODE_LABEL: Record<LessonMode, string> = {
  visit: "방문",
  phone: "전화",
  video: "화상",
};

/** 패키지 구매 모드 — video = 온라인 강의 */
export const PACKAGE_MODE_LABEL: Record<LessonMode, string> = {
  visit: "방문 패키지",
  phone: "전화 패키지",
  video: "온라인 강의",
};

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
  /** 추가 피드백 1회 금액 (미설정 시 feedbackPrice 사용) */
  feedbackAdditionalPrice: number;
  phonePrice15Min: number;
  phonePrice30Min: number;
  visitPrice: number;
  visitDurationMin: number;
  feedbackIncludedMin: number;
  feedbackExtraPer5Min: number;
  updatedAt: string;
};

/** 주간 휴무 요일 — JS Date.getDay() (0=일 … 6=토) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_OFF_WEEKDAYS: Weekday[] = [0];

/** 전화·방문 기본 예약 가능 시간 (HH:mm) */
export const DEFAULT_BOOKING_TIMES: string[] = [
  "10:00",
  "11:00",
  "14:00",
  "14:30",
  "15:00",
  "19:00",
  "19:30",
  "20:00",
  "21:00",
];

export type Master = {
  id: string;
  userId?: string;
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
  /** 전화·방문 예약 불가 요일 */
  offWeekdays: Weekday[];
  /** 전화·방문 예약 불가 특정일 (YYYY-MM-DD) */
  offDates: string[];
  /** 전화·방문 예약 가능 시간 (HH:mm) */
  bookingTimes: string[];
};

export type Student = {
  id: string;
  userId?: string;
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
  practiceRecordId?: string;
  timestampComments: TimestampComment[];
  masterSummary?: string;
  /** 강사 답변에 첨부한 영상/음성 */
  replyMediaUrl?: string;
  replyMediaType?: "audio" | "video";
  replyMediaLabel?: string;
  recommendedPackageId?: string;
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
  memo?: string;
  durationSec: number;
  mediaUrl?: string;
  createdAt: string;
};

/** 마스터가 직접 발급한 다운로드형 쿠폰 */
export type MasterCoupon = {
  id: string;
  masterId: string;
  title: string;
  discountAmount: number;
  totalQuantity: number;
  remainingQuantity: number;
  isActive: boolean;
  createdAt: string;
};

export type StudentCouponClaim = {
  id: string;
  couponId: string;
  studentId: string;
  claimedAt: string;
  usedAt?: string;
};

export type PackagePurchase = {
  id: string;
  studentId: string;
  masterId: string;
  packageId: string;
  mode: LessonMode;
  priceAtPurchase: number;
  packageTitle: string;
  couponClaimId?: string;
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
  masterCoupons: MasterCoupon[];
  studentCouponClaims: StudentCouponClaim[];
  masterPackages: MasterPackage[];
  packagePurchases: PackagePurchase[];
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
  masterCoupons: [],
  studentCouponClaims: [],
  masterPackages: [],
  packagePurchases: [],
};

export const DEMO_STUDENT_ID = "student-1";
export const DEMO_MASTER_ID = "master-1";

export function formatPrice(won: number) {
  return won.toLocaleString("ko-KR");
}
