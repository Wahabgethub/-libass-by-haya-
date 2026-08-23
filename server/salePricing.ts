import type { Product } from "@shared/commerce/types";

export type SaleOverrideLike = { regularPrice: string; salePrice: string | null; enabled: number };
export function resolveEffectivePrice(shopPrice: string, override?: SaleOverrideLike) {
  if (!override) return { regularPrice: shopPrice, salePrice: null, effectivePrice: shopPrice };
  const regularPrice = override.regularPrice;
  const eligible = override.enabled === 1 && override.salePrice && Number(override.salePrice) < Number(regularPrice);
  return { regularPrice, salePrice: eligible ? override.salePrice : null, effectivePrice: eligible ? override.salePrice! : regularPrice };
}
export function applySaleOverride(product: Product, override?: SaleOverrideLike): Product {
  if (!override) return product;
  const regular = { amount: override.regularPrice, currencyCode: product.priceRange.min.currencyCode };
  const effective = resolveEffectivePrice(product.priceRange.min.amount, override);
  const price = { amount: effective.effectivePrice, currencyCode: regular.currencyCode };
  return { ...product, priceRange: { min: price, max: price }, variants: product.variants.map(variant => ({ ...variant, price: { amount: effective.effectivePrice, currencyCode: variant.price.currencyCode }, compareAtPrice: effective.salePrice ? { amount: effective.regularPrice, currencyCode: variant.price.currencyCode } : null })) };
}
