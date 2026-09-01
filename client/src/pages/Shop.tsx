import { StoreFooter, StoreHeader } from "@/components/StoreHeader";
import { useCart } from "@/contexts/CartContext";
import { formatMoney, salePercent } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Loader2, Plus } from "lucide-react";
import { Link } from "wouter";

function styleFolder(productType: string | null | undefined): string {
  const raw = (productType ?? "").trim();
  const value = raw.toLowerCase();
  if (!value) return "Unsorted";
  if (value.includes("kurti")) return "Kurti";
  if (/3[\s-]?(pc|piece)/.test(value)) return "3-pc Stitched";
  if (/2[\s-]?(pc|piece)/.test(value)) return "2-pc Stitched";
  if (value.includes("unstitch")) return "Unstitched";
  return raw.replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function Shop() {
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery({ first: 1000 }, { refetchInterval: 20000 });
  const { data: filterMeta = [] } = trpc.brand.suitFilters.useQuery(undefined, { refetchInterval: 20000 });
  const metaByHandle = new Map(filterMeta.map(item => [item.productHandle, item]));
  const visible = products.filter(product => !metaByHandle.get(product.handle)?.hideFromAll);
  return <div className="min-h-screen bg-[#121212] text-white"><StoreHeader /><main><section className="kinetic-grid border-b border-white/15 px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><p className="eyebrow">Archive / all objects</p><div className="mt-4 flex flex-col justify-between gap-7 md:flex-row md:items-end"><h1 className="max-w-3xl font-display text-6xl leading-[.82] sm:text-8xl">FORM,<br /><span className="text-white/35">CATALOGUED.</span></h1><p className="max-w-xs text-sm leading-7 text-white/55">Objects for a considered wardrobe. Full garment stories, regular-and-sale pricing, and Cash on Delivery checkout.</p></div><p className="mt-6 font-mono text-[9px] tracking-[.12em] text-white/40 uppercase">{visible.length} suit{visible.length === 1 ? "" : "s"} shown in the archive</p></div></section><section className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8">{isLoading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#d4ff00]" /></div> : visible.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">{visible.map(product => <CatalogCard key={product.id} product={product} meta={metaByHandle.get(product.handle)} />)}</div> : <div className="flex min-h-72 flex-col items-center justify-center text-center"><p className="font-display text-5xl">No suits yet.</p><p className="mt-3 max-w-sm text-sm text-white/55">Publish a suit in Studio to see it here.</p></div>}</section></main><StoreFooter /></div>;
}

function CatalogCard({ product, meta }: { product: any; meta?: { color: string; style: string; season: string } }) { const { addItem, loading } = useCart(); const variant = product.variants[0]; const image = product.images[0]; const discount = variant ? salePercent(variant.price, variant.compareAtPrice) : null; return <article className="kinetic-card group"><Link href={`/products/${product.handle}`} className="relative block overflow-hidden border border-white/15 bg-white/5"><div className="aspect-[.78] overflow-hidden">{image && <img src={image.url} alt={image.altText ?? product.title} className="kinetic-card-media h-full w-full object-cover transition duration-700" />}</div>{discount && <span className="absolute left-2 top-2 z-10 bg-[#d4ff00] px-3 py-1.5 font-mono text-sm font-extrabold tracking-[.03em] text-[#121212] uppercase shadow-[0_2px_10px_rgba(212,255,0,.5)] sm:text-base">-{discount}%</span>}<span className="absolute right-2 top-2 font-mono text-[8px] tracking-[.1em] text-white/60 uppercase">{styleFolder(product.productType)}</span></Link><div className="mt-3 flex gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.title}</p><div className="mt-1 flex gap-2 font-mono text-[10px] text-white/50">{variant?.compareAtPrice && <span className="line-through">{formatMoney(variant.compareAtPrice)}</span>}<span className={discount ? "text-[#d4ff00]" : ""}>{variant && formatMoney(variant.price)}</span></div>{meta?.season && <p className="mt-2 truncate font-mono text-[8px] tracking-[.11em] text-white/40 uppercase">{meta.season}</p>}</div><button onClick={() => variant && addItem(variant.id, 1)} disabled={loading || !variant?.availableForSale} className="quick-add border border-[#d4ff00] p-2 text-[#d4ff00] hover:bg-[#d4ff00] hover:text-[#121212]" aria-label={`Quick add ${product.title}`}><Plus className="h-3.5 w-3.5" /></button></div><Link href={`/products/${product.handle}`} className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] tracking-[.12em] text-white/45 uppercase hover:text-[#d4ff00]">View object <ArrowUpRight className="h-3 w-3" /></Link></article>; }
