import type {
  EumDatabase,
  FeedbackOrder,
  Master,
  MasterPricing,
  PracticeRecord,
  Reservation,
  TimestampComment,
} from "./schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  cancelFeedbackOrderSupabase,
  cancelReservationSupabase,
  completeFeedbackOrderSupabase,
  createFeedbackOrderSupabase,
  createPracticeRecordSupabase,
  createReservationSupabase,
  createStudentReviewSupabase,
  fetchDb,
  fetchFeedbackOrder,
  fetchMaster,
  markFeedbackInReviewSupabase,
  toggleFavoriteSupabase,
  updateMasterPricingSupabase,
  updateMasterProfileSupabase,
} from "./supabase-store";
import {
  cancelFeedbackOrderLocal,
  cancelReservationLocal,
  completeFeedbackOrder as completeFeedbackOrderLocal,
  createFeedbackOrder as createFeedbackOrderLocal,
  createPracticeRecordLocal,
  createReservation as createReservationLocal,
  createStudentReviewLocal,
  getDb as getDbLocal,
  getFeedbackOrder as getFeedbackOrderLocal,
  getMaster as getMasterLocal,
  markFeedbackInReviewLocal,
  toggleFavoriteAcademyLocal,
  toggleFavoriteMasterLocal,
  updateMasterPricing as updateMasterPricingLocal,
  updateMasterProfileLocal,
} from "./store";

function notifyDbUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("eum-db-updated"));
  }
}

export async function loadDb(userId?: string): Promise<EumDatabase> {
  if (isSupabaseConfigured()) {
    return fetchDb(userId);
  }
  return getDbLocal();
}

export async function loadMaster(id: string): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    return fetchMaster(id);
  }
  return getMasterLocal(id);
}

export async function saveMasterPricing(
  masterId: string,
  patch: Pick<
    MasterPricing,
    | "feedbackPrice"
    | "phonePrice15Min"
    | "phonePrice30Min"
    | "visitPrice"
    | "visitDurationMin"
  >,
): Promise<Master | undefined> {
  if (isSupabaseConfigured()) {
    return updateMasterPricingSupabase(masterId, patch);
  }
  return updateMasterPricingLocal(masterId, patch);
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
  payload: { timestampComments: TimestampComment[]; masterSummary: string },
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

export async function saveMasterProfile(
  masterId: string,
  patch: Partial<
    Pick<Master, "name" | "title" | "bio" | "tags" | "career" | "phoneNumber" | "responseTimeLabel">
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
    });
    notifyDbUpdated();
    return master;
  }
  const master = updateMasterProfileLocal(masterId, patch);
  notifyDbUpdated();
  return master;
}
