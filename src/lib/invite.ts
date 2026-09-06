export function getSignupInvitePath() {
  return "/signup";
}

export function getSignupInviteUrl(origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}${getSignupInvitePath()}`;
}

export function getSignupInviteMessage(origin: string) {
  const url = getSignupInviteUrl(origin);
  return `[eum] 보컬 코칭 회원가입\n${url}`;
}

/** 학생별 추천인 코드 (표시·공유용). 서버 검증은 추후 연동. */
export function getFriendInviteCode(studentId: string) {
  const raw = studentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length >= 5) return raw.slice(0, 5);
  const pad = "EUM01";
  return (raw + pad).slice(0, 5);
}

export function getFriendInviteUrl(origin: string, code: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/signup?ref=${encodeURIComponent(code)}`;
}

export function getFriendInviteMessage(origin: string, code: string) {
  const url = getFriendInviteUrl(origin, code);
  return `[eum] 보컬 코칭 초대\n추천인 코드: ${code}\n${url}`;
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return text;
}

export async function copySignupInviteLink(origin: string) {
  return copyText(getSignupInviteMessage(origin));
}

export async function copyFriendInviteCode(code: string) {
  return copyText(code);
}

export async function copyFriendInviteLink(origin: string, code: string) {
  return copyText(getFriendInviteMessage(origin, code));
}
