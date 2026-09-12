import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function phonesMatch(a: string, b: string) {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length > 0 && da === db;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; phone?: string };
    const name = body.name?.trim() ?? "";
    const phone = normalizePhone(body.phone ?? "");

    if (!name || !phoneDigits(phone)) {
      return NextResponse.json(
        { error: "이름과 휴대폰 번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    if (isSupabaseConfigured()) {
      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json(
          { error: "아이디 찾기 설정이 아직 준비되지 않았어요." },
          { status: 503 },
        );
      }

      const admin = createAdminClient();
      const { data, error } = await admin
        .from("profiles")
        .select("email, name, phone")
        .eq("name", name);

      if (error) {
        return NextResponse.json({ error: "조회에 실패했어요." }, { status: 500 });
      }

      const matched = (data ?? []).find((row) => phonesMatch(row.phone ?? "", phone));
      if (!matched?.email) {
        return NextResponse.json(
          { error: "일치하는 계정을 찾지 못했어요." },
          { status: 404 },
        );
      }

      return NextResponse.json({ email: maskEmail(matched.email) });
    }

    return NextResponse.json(
      { error: "일치하는 계정을 찾지 못했어요." },
      { status: 404 },
    );
  } catch {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
