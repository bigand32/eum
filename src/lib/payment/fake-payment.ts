import { formatPrice } from "@/lib/db/schema";

/** MVP: 실제 PG 없이 결제 UX만 시뮬레이션 */
export async function processFakePayment(amount: number): Promise<void> {
  void amount;
  await new Promise((resolve) => setTimeout(resolve, 900));
}

export function formatFakePaymentLabel(amount: number) {
  return `${formatPrice(amount)}원 테스트 결제`;
}
