import type { Money } from "@shared/commerce/types";

export function formatMoney(money: Money | null | undefined) {
  if (!money) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(money.amount));
}

export function salePercent(price: Money, compareAtPrice: Money | null) {
  if (!compareAtPrice || Number(compareAtPrice.amount) <= Number(price.amount)) return null;
  return Math.round((1 - Number(price.amount) / Number(compareAtPrice.amount)) * 100);
}
