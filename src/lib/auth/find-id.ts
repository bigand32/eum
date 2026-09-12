import { normalizePhone } from "@/lib/auth/phone";

const ACCOUNTS_KEY = "eum_accounts_v1";

type StoredAccount = {
  email: string;
  user: { name: string; phone: string };
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function phonesMatch(a: string, b: string) {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  return da.length > 0 && da === db;
}

function findLocalEmail(name: string, phone: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return null;
    const accounts = JSON.parse(raw) as StoredAccount[];
    const matched = accounts.find(
      (a) => a.user.name === name && phonesMatch(a.user.phone, phone),
    );
    return matched ? maskEmail(matched.email) : null;
  } catch {
    return null;
  }
}

export async function findAccountEmail(input: {
  name: string;
  phone: string;
}): Promise<{ email?: string; error?: string }> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);

  if (!name || !phone.replace(/\D/g, "")) {
    return { error: "이름과 휴대폰 번호를 입력해 주세요." };
  }

  const local = findLocalEmail(name, phone);
  if (local) return { email: local };

  try {
    const res = await fetch("/api/auth/find-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = (await res.json()) as { email?: string; error?: string };
    if (!res.ok) {
      return { error: data.error || "일치하는 계정을 찾지 못했어요." };
    }
    return { email: data.email };
  } catch {
    return { error: "잠시 후 다시 시도해 주세요." };
  }
}
