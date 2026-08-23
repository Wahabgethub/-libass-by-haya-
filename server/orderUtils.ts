export type LocalPaymentMethod = "cod";
export type LocalPaymentStatus = "cash_due";

export function getInitialPaymentStatus(paymentMethod: LocalPaymentMethod): LocalPaymentStatus {
  return paymentMethod === "cod" ? "cash_due" : "cash_due";
}

export function createOrderNumber(now: number, entropy: string) {
  return `HAYA-${now.toString(36).toUpperCase()}-${entropy.slice(0, 4).toUpperCase()}`;
}
