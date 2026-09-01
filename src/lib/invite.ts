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

export async function copySignupInviteLink(origin: string) {
  const message = getSignupInviteMessage(origin);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return message;
  }

  const textarea = document.createElement("textarea");
  textarea.value = message;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return message;
}
