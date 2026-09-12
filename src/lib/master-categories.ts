/** 강사 전문 분야 — 가입·프로필에서 이 목록만 선택 가능 */
export const MASTER_CATEGORIES = [
  "K-pop/가요",
  "발라드",
  "POP",
  "인디",
  "포크",
  "R&B/소울",
  "힙합/랩",
  "재즈",
  "블루스",
  "락/록",
  "메탈",
  "성악",
  "뮤지컬",
  "트로트",
  "CCM",
] as const;

export type MasterCategory = (typeof MASTER_CATEGORIES)[number];

export function isMasterCategory(value: string): value is MasterCategory {
  return (MASTER_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeMasterCategories(values: string[]): MasterCategory[] {
  const seen = new Set<string>();
  const next: MasterCategory[] = [];
  for (const value of values) {
    if (!isMasterCategory(value) || seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next;
}
