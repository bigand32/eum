import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PartnerInquiryInput = {
  academyName: string;
  address: string;
  message: string;
};

export const PARTNER_INQUIRY_MAX = {
  academyName: 60,
  address: 120,
  message: 1000,
} as const;

/** 파트너 문의 접수 메일 — Supabase 미설정/실패 시 안내용 */
export const PARTNER_INQUIRY_EMAIL = "help@eum.app";

/** 입력 검증 — 통과하면 null */
export function partnerInquiryError(input: PartnerInquiryInput) {
  if (!input.academyName.trim()) return "학원명을 입력해 주세요.";
  if (!input.address.trim()) return "주소를 입력해 주세요.";
  if (!input.message.trim()) return "문의 내역을 입력해 주세요.";
  return null;
}

/** RLS 정책이 본인 student_id 를 요구하므로 studentId 는 필수 */
export async function submitPartnerInquiry(input: PartnerInquiryInput, studentId: string) {
  if (!isSupabaseConfigured()) throw new Error("PARTNER_INQUIRY_UNAVAILABLE");

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("partner_inquiries").insert({
    student_id: studentId,
    academy_name: input.academyName.trim(),
    address: input.address.trim(),
    message: input.message.trim(),
  });

  if (error) throw error;
}
