import type {
  EumDatabase,
  FeedbackOrder,
  Master,
  MasterPricing,
  Reservation,
  TimestampComment,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import {
  mapDatabase,
  mapFeedbackOrder,
  mapMaster,
  mapPracticeRecord,
  mapReservation,
  type DbFeedbackOrder,
  type DbMaster,
  type DbPracticeRecord,
  type DbReservation,
  type DbStudentReview,
} from "@/lib/supabase/mappers";

export async function fetchDb(userId?: string): Promise<EumDatabase> {
  const supabase = createClient();

  const safe = async <T,>(query: PromiseLike<{ data: T | null; error: unknown }>) => {
    try {
      return await query;
    } catch {
      return { data: null, error: new Error("NETWORK_ERROR") };
    }
  };

  const [
    mastersRes,
    studentsRes,
    ordersRes,
    reservationsRes,
    reviewsRes,
    practiceRes,
    favMastersRes,
    favAcademiesRes,
  ] = await Promise.all([
    safe(supabase.from("masters").select("*").order("created_at")),
    safe(supabase.from("students").select("*, profiles!students_user_id_fkey(name, phone)")),
    safe(supabase.from("feedback_orders").select("*").order("created_at", { ascending: false })),
    safe(supabase.from("reservations").select("*").order("created_at", { ascending: false })),
    safe(supabase.from("student_reviews").select("*").order("created_at", { ascending: false })),
    safe(supabase.from("practice_records").select("*").order("created_at", { ascending: false })),
    userId
      ? safe(supabase.from("favorite_masters").select("master_id").eq("user_id", userId))
      : Promise.resolve({ data: [], error: null }),
    userId
      ? safe(supabase.from("favorite_academies").select("academy_id").eq("user_id", userId))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (mastersRes.error) throw mastersRes.error;

  return mapDatabase({
    masters: (mastersRes.data ?? []) as DbMaster[],
    students: studentsRes.data ?? [],
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
  });
}

export async function fetchMaster(id: string): Promise<Master | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("masters").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return mapMaster(data as DbMaster);
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
    | "phonePrice15Min"
    | "phonePrice30Min"
    | "visitPrice"
    | "visitDurationMin"
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

  if (error || !data) return undefined;
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
}): Promise<FeedbackOrder> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("feedback_orders")
    .insert({
      student_id: input.studentId,
      master_id: input.masterId,
      status: "paid",
      price_at_purchase: input.priceAtPurchase,
      student_message: input.studentMessage,
      media_label: input.mediaLabel,
      media_type: input.mediaType,
      media_duration_sec: input.mediaDurationSec ?? null,
      extra_duration_fee: input.extraDurationFee ?? null,
      media_url: input.mediaUrl ?? null,
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
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      student_id: input.studentId,
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
  payload: { timestampComments: TimestampComment[]; masterSummary: string },
): Promise<FeedbackOrder | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedback_orders")
    .update({
      status: "completed",
      timestamp_comments: payload.timestampComments,
      master_summary: payload.masterSummary,
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
  durationSec: number;
  mediaUrl?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("practice_records")
    .insert({
      student_id: input.studentId,
      title: input.title,
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
