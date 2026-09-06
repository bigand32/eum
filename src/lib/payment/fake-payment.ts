import { formatPrice } from "@/lib/db/schema";

export type PaymentMode = "fake" | "ready";

/** 현재는 테스트 결제만. 실연동 키 준비되면 toss 등으로 전환 */
export function getPaymentMode(): PaymentMode {
  const mode = process.env.NEXT_PUBLIC_PAYMENT_MODE?.trim().toLowerCase();
  if (mode === "ready") return "ready";
  return "fake";
}

export function isLivePaymentEnabled() {
  return getPaymentMode() === "ready" && Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}

/** MVP: 실제 PG 없이 결제 UX만 시뮬레이션. 실연동 전까지 공통 진입점 */
export async function processPayment(amount: number): Promise<{
  mode: PaymentMode;
  transactionId: string;
}> {
  void amount;
  await new Promise((resolve) => setTimeout(resolve, 150));
  return {
    mode: getPaymentMode(),
    transactionId: `test_${Date.now()}`,
  };
}

/** @deprecated use processPayment */
export async function processFakePayment(amount: number): Promise<void> {
  await processPayment(amount);
}

export function formatPaymentLabel(amount: number) {
  if (isLivePaymentEnabled()) {
    return `${formatPrice(amount)}원 결제`;
  }
  return `${formatPrice(amount)}원 테스트 결제`;
}

/** @deprecated use formatPaymentLabel */
export function formatFakePaymentLabel(amount: number) {
  return formatPaymentLabel(amount);
}

export function getPaymentModeNotice(): string {
  if (isLivePaymentEnabled()) {
    return "결제는 안전하게 처리됩니다.";
  }
  return "MVP 테스트 모드 — 실제 결제는 진행되지 않아요.";
}
