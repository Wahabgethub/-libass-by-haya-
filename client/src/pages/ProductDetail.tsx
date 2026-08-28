import { StoreFooter, StoreHeader } from "@/components/StoreHeader";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatMoney, salePercent } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import type { Image, ProductVariant } from "@shared/commerce/types";
import { ChevronLeft, ChevronRight, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const MAX_PRODUCT_VIEWS = 6;

type SizeGroup =
  | { label: string; kind: "direct"; variant: ProductVariant; available: boolean }
  | { label: string; kind: "group"; subs: { label: string; variant: ProductVariant }[]; available: boolean };

export default function ProductDetail({ params }: { params: { handle: string } }) {
  const { data: product, isLoading, error } = trpc.commerce.products.byHandle.useQuery({ handle: params.handle });
  const { addItem, loading } = useCart();
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const [subLabel, setSubLabel] = useState<string | null>(null);

  const sizeOption = product?.options.find(option => option.name === "Size");
  const sizeGroups: SizeGroup[] | undefined = useMemo(() => {
    if (!product || !sizeOption) return undefined;
    return sizeOption.values.map(label => {
      const variantsForSize = product.variants.filter(v => v.selectedOptions.some(o => o.name === "Size" && o.value === label));
      const withMeasurement = variantsForSize.filter(v => v.selectedOptions.some(o => o.name === "Measurement"));
      if (withMeasurement.length > 0) {
        const subs = withMeasurement.map(v => ({ label: v.selectedOptions.find(o => o.name === "Measurement")!.value, variant: v }));
        return { label, kind: "group" as const, subs, available: subs.some(sub => sub.variant.availableForSale) };
      }
      const direct = variantsForSize[0];
      return { label, kind: "direct" as const, variant: direct, available: direct?.availableForSale ?? false };
    });
  }, [product, sizeOption]);

  useEffect(() => {
    if (!sizeGroups || !sizeGroups.length) { setSizeLabel(null); setSubLabel(null); return; }
    const firstAvailable = sizeGroups.find(g => g.available) ?? sizeGroups[0]!;
    setSizeLabel(firstAvailable.label);
    if (firstAvailable.kind === "group") {
      const firstSub = firstAvailable.subs.find(sub => sub.variant.availableForSale) ?? firstAvailable.subs[0];
      setSubLabel(firstSub?.label ?? null);
    } else {
      setSubLabel(null);
    }
  }, [sizeGroups]);

  const activeGroup = sizeGroups?.find(g => g.label === sizeLabel);
  const variant = useMemo(() => {
    if (!product) return undefined;
    if (!sizeGroups) return product.variants.find(v => v.availableForSale) ?? product.variants[0];
    if (!activeGroup) return product.variants.find(v => v.availableForSale) ?? product.variants[0];
    if (activeGroup.kind === "direct") return activeGroup.variant;
    const sub = activeGroup.subs.find(s => s.label === subLabel) ?? activeGroup.subs.find(s => s.variant.availableForSale) ?? activeGroup.subs[0];
    return sub?.variant;
  }, [product, sizeGroups, activeGroup, subLabel]);

  if (isLoading) return <Loading />;
  if (error || !product || !variant) return <Missing />;
  const suit = product.tags.some(tag => /3\s*pc|three\s*piece|3\s*piece/i.test(tag)) || /three\s*piece|3\s*pc/i.test(product.title);
  const images = product.images.slice(0, MAX_PRODUCT_VIEWS);
  const discount = salePercent(variant.price, variant.compareAtPrice);
  const selectSize = (group: SizeGroup) => { setSizeLabel(group.label); if (group.kind === "group") { const firstSub = group.subs.find(sub => sub.variant.availableForSale) ?? group.subs[0]; setSubLabel(firstSub?.label ?? null); } else { setSubLabel(null); } };

  return <div className="min-h-screen bg-[#121212] text-white"><StoreHeader /><main className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 sm:px-7 lg:px-10"><Link href="/shop" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-white/50 uppercase hover:text-[#e1c27a]"><ChevronLeft className="h-4 w-4" />Back to collection</Link><div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(350px,.75fr)] lg:gap-14"><SuitGallery productTitle={product.title} images={images} discount={discount} /><aside className="lg:sticky lg:top-24 lg:h-fit"><p className="eyebrow">{product.productType || "Libaas by HAYA"} / Collection</p><h1 className="mt-3 font-display text-5xl leading-[.86] sm:text-6xl">{product.title}</h1><div className="mt-6 flex items-center gap-2 font-mono text-sm">{variant.compareAtPrice && <span className="text-white/40 line-through">{formatMoney(variant.compareAtPrice)}</span>}<span className={discount ? "text-[#e1c27a]" : ""}>{formatMoney(variant.price)}</span>{discount && <span className="ml-1 text-[9px] tracking-[.13em] text-[#e1c27a] uppercase">{discount}% off</span>}</div><p className="mt-7 max-w-lg text-sm leading-7 text-white/60">{product.description || "A considered piece from the Libaas by HAYA collection."}</p>{suit && <div className="mt-7 border border-[#e1c27a]/35 bg-[#e1c27a]/10 p-4"><div className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-[#e1c27a]" /><div><p className="font-mono text-[9px] tracking-[.15em] text-[#e1c27a] uppercase">Coordinated set</p><p className="mt-1 text-sm leading-6 text-white/65">A complete piece from the collection, shown with its own front, back, and detail views.</p></div></div></div>}<div className="my-7 border-t border-white/15" />

  {product.colorVariants && product.colorVariants.length > 1 && <div className="mb-6"><p className="mb-3 font-mono text-[10px] tracking-[.12em] text-white/60 uppercase">Color</p><div className="flex flex-wrap gap-3">{product.colorVariants.map(cv => { const swatch = <div className={`flex flex-col items-center gap-1.5 ${cv.active ? "" : "cursor-pointer"}`}><div className={`h-14 w-14 overflow-hidden border-2 ${cv.active ? "border-[#e1c27a]" : "border-white/20 hover:border-white/60"}`}>{cv.imageUrl ? <img src={cv.imageUrl} alt={cv.colorLabel} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-white/10" />}</div><span className={`font-mono text-[8px] tracking-[.08em] uppercase ${cv.active ? "text-[#e1c27a]" : "text-white/50"}`}>{cv.colorLabel}</span></div>; return cv.active ? <div key={cv.handle}>{swatch}</div> : <Link key={cv.handle} href={`/products/${cv.handle}`}>{swatch}</Link>; })}</div></div>}

  {sizeGroups && sizeGroups.length > 0 && <div className="mb-6"><p className="mb-3 font-mono text-[10px] tracking-[.12em] text-white/60 uppercase">Size</p><div className="flex flex-wrap gap-2">{sizeGroups.map(group => <button key={group.label} disabled={!group.available} onClick={() => group.available && selectSize(group)} className={`relative min-w-12 border px-4 py-2.5 font-mono text-xs transition ${!group.available ? "cursor-not-allowed border-white/10 text-white/35" : sizeLabel === group.label ? "border-[#e1c27a] bg-[#e1c27a] text-[#171417]" : "border-white/20 text-white hover:border-white"}`}>{!group.available && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="h-px w-[70%] rotate-[-12deg] bg-white/40" /></span>}{group.label}</button>)}</div>{activeGroup?.kind === "group" && <div className="mt-4"><p className="mb-2 font-mono text-[9px] tracking-[.11em] text-white/45 uppercase">Select measurement for {activeGroup.label}</p><div className="flex flex-wrap gap-2">{activeGroup.subs.map(sub => { const available = sub.variant.availableForSale; return <button key={sub.label} disabled={!available} onClick={() => available && setSubLabel(sub.label)} className={`relative min-w-11 border px-3.5 py-2 font-mono text-xs transition ${!available ? "cursor-not-allowed border-white/10 text-white/35" : subLabel === sub.label ? "border-[#e1c27a] bg-[#e1c27a] text-[#171417]" : "border-white/20 text-white hover:border-white"}`}>{!available && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="h-px w-[70%] rotate-[-12deg] bg-white/40" /></span>}{sub.label}</button>; })}</div></div>}</div>}

  <Button disabled={loading || !variant.availableForSale} onClick={() => addItem(variant.id, 1)} className="h-13 w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.16em] text-[#171417] uppercase hover:bg-white">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}{variant.availableForSale ? "Add to bag" : "Sold out"}</Button><p className="mt-4 text-center font-mono text-[9px] tracking-[.12em] text-white/45 uppercase">Cash on Delivery only</p><div className="mt-9 border-t border-white/15 pt-6"><p className="font-mono text-[10px] tracking-[.13em] text-white/60 uppercase">Specification notes</p><div className="mt-4 grid gap-3 text-sm leading-6 text-white/55"><p>01 / Each piece keeps its own set of garment views.</p><p>02 / Sale pricing is shown directly from the collection record.</p><p>03 / Customer details remain private after Cash on Delivery checkout.</p></div></div></aside></div></main><StoreFooter /></div>;
}

function SuitGallery({ productTitle, images, discount }: { productTitle: string; images: Image[]; discount: number | null }) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [productTitle]);
  if (!images.length) return <section className="flex min-h-[440px] items-center justify-center border border-white/15 bg-white/[.03] p-8 text-center"><div><p className="font-display text-4xl">Gallery in preparation.</p><p className="mt-3 max-w-sm text-sm leading-6 text-white/50">Studio can add separate views for this piece.</p></div></section>;
  const image = images[active]!;
  const label = image.viewLabel || (active === 0 ? "front" : active === 1 ? "back" : active === 2 ? "detail" : `view ${active + 1}`);
  const move = (direction: -1 | 1) => setActive(current => Math.min(Math.max(current + direction, 0), images.length - 1));
  return <section aria-label={`${productTitle} views`}><div className="mb-3 flex items-center justify-between gap-3"><p className="font-mono text-[9px] tracking-[.14em] text-white/45 uppercase">Views / click a picture or scroll choices</p><span className="font-mono text-[9px] tracking-[.13em] text-[#e1c27a] uppercase">{active + 1} / {images.length}</span></div><div className="relative overflow-hidden border border-[#e1c27a] bg-white/5"><div className="aspect-[4/5]"><img src={image.url} alt={image.altText ?? `${productTitle} view`} className="h-full w-full object-cover" /></div>{discount && active === 0 && <span className="absolute left-3 top-3 bg-[#e1c27a] px-2.5 py-1 font-mono text-[9px] tracking-[.12em] text-[#171417] uppercase">Sale · {discount}%</span>}{images.length > 1 && <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between"><button type="button" aria-label="Show previous view" disabled={active === 0} onClick={() => move(-1)} className="border border-white/25 bg-[#171417]/80 p-2 text-white hover:border-[#e1c27a] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Show next view" disabled={active === images.length - 1} onClick={() => move(1)} className="border border-white/25 bg-[#171417]/80 p-2 text-white hover:border-[#e1c27a] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}</div><div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">{images.map((view, index) => <button key={`${view.url}-${index}`} type="button" onClick={() => setActive(index)} className={`w-24 shrink-0 snap-start overflow-hidden border text-left transition sm:w-28 ${active === index ? "border-[#e1c27a]" : "border-white/15 hover:border-white/60"}`}><img src={view.url} alt="" className="aspect-[4/5] w-full object-cover" /></button>)}</div><p aria-live="polite" className="mt-2 font-mono text-[9px] tracking-[.13em] text-white/45 uppercase">Select a picture, use arrows, or scroll the view strip</p></section>;
}

function Loading() { return <div className="min-h-screen bg-[#121212]"><StoreHeader /><div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#d4ff00]" /></div></div>; }
function Missing() { return <div className="min-h-screen bg-[#121212] text-white"><StoreHeader /><main className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center"><p className="font-display text-5xl">This form has moved on.</p><Link href="/shop" className="mt-6 font-mono text-[10px] tracking-[.14em] text-[#d4ff00] uppercase">Explore the collection</Link></main><StoreFooter /></div>; }
