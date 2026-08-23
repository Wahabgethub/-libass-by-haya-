import type { Product } from "@shared/commerce/types";
import { formatMoney, salePercent } from "@/lib/money";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const primaryVariant = product.variants[0];
  const discount = primaryVariant ? salePercent(primaryVariant.price, primaryVariant.compareAtPrice) : null;
  const image = product.images[0];

  return <article className="group min-w-0">
    <Link href={`/products/${product.handle}`} className="relative block overflow-hidden bg-[#ebe4da]">
      <div className="aspect-[4/5] overflow-hidden">{image ? <img src={image.url} alt={image.altText ?? product.title} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" /> : <div className="h-full w-full bg-[#e4d8c8]" />}</div>
      {discount && <span className="absolute left-3 top-3 bg-[#9c7657] px-2.5 py-1 text-[9px] font-semibold tracking-[0.14em] text-white uppercase">Sale · {discount}%</span>}
      <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-[#fbf8f2] text-[#221d17] opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
    </Link>
    <div className="flex items-start justify-between gap-3 px-0.5 pb-2 pt-4"><div><Link href={`/products/${product.handle}`} className="text-sm font-medium leading-5 tracking-[0.01em] text-[#2e271f]">{product.title}</Link><p className="mt-1 text-xs text-[#81776a]">{product.productType || "Libaas collection"}</p></div><div className="shrink-0 text-right text-sm">{primaryVariant?.compareAtPrice && <span className="mr-1.5 text-xs text-[#978c7f] line-through">{formatMoney(primaryVariant.compareAtPrice)}</span>}<span className={discount ? "text-[#a55f43]" : ""}>{formatMoney(product.priceRange.min)}</span></div></div>
  </article>;
}
