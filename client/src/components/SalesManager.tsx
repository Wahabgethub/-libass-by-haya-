import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { BadgePercent, Loader2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function SalesManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const { data: sales = [] } = trpc.admin.sales.list.useQuery({ adminToken });
  const [handle, setHandle] = useState("");
  const [regular, setRegular] = useState("");
  const [sale, setSale] = useState("");
  const [percent, setPercent] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  const product = useMemo(() => products.find(item => item.handle === handle), [products, handle]);
  const active = useMemo(() => sales.find(item => item.productHandle === handle), [sales, handle]);
  const filteredProducts = useMemo(() => products.filter(item => `${item.title} ${item.handle}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  useEffect(() => {
    if (!handle) return;
    const fallback = product?.variants[0]?.compareAtPrice?.amount ?? product?.variants[0]?.price.amount ?? "";
    setRegular(active?.regularPrice ?? fallback);
    setSale(active?.salePrice ?? "");
    setPercent(active?.discountPercent ? String(active.discountPercent) : "");
  }, [handle, active?.id, product?.id]);

  const save = trpc.admin.sales.upsert.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.sales.list.invalidate(), utils.commerce.products.invalidate()]);
      toast.success("Sale pricing is live across the storefront and future COD bills.");
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.admin.products.remove.useMutation({
    onSuccess: async () => {
      await utils.commerce.products.invalidate();
      toast.success("Product removed from the Libaas storefront.");
      setHandle("");
    },
    onError: error => toast.error(error.message),
  });
  const removeWithManagedMedia = trpc.admin.products.removeWithManagedMedia.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.commerce.products.invalidate(), utils.admin.media.list.invalidate()]);
      toast.success(`Product removed from the storefront and ${result.removedMedia} attached local gallery view${result.removedMedia === 1 ? "" : "s"} deleted.`);
      setHandle("");
    },
    onError: error => toast.error(error.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!handle || !regular) return;
    const inputPercent = Number(percent);
    const calculatedSale = inputPercent > 0
      ? (Number(regular) * (1 - inputPercent / 100)).toFixed(2)
      : sale || undefined;
    save.mutate({
      adminToken,
      productHandle: handle,
      regularPrice: regular,
      salePrice: calculatedSale,
      discountPercent: inputPercent > 0 ? inputPercent : undefined,
      enabled: Boolean(calculatedSale),
    });
  }

  const studioMain = useStudioPanelRoot();
  if (!studioMain) return null;

  return createPortal(
    <section className="mt-10 border border-white/15 bg-[#181818] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Sales manager</p>
          <h2 className="mt-2 font-display text-4xl">Product price controls</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            Set the regular price and a lower sale price or percentage. The reduced price appears in the collection, product view, checkout, and every new COD bill.
          </p>
        </div>
        <BadgePercent className="h-6 w-6 text-[#e1c27a]" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="border border-white/10">
          <div className="border-b border-white/10 px-4 py-3 font-mono text-[9px] tracking-[.14em] text-white/45 uppercase">Live products / {filteredProducts.length} available</div>
          <div className="border-b border-white/10 p-3"><Input value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(50); }} className="h-9 rounded-none border-white/15 bg-transparent text-sm text-white" placeholder="Search product name" /></div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-[#e1c27a]" /></div>
            ) : visibleProducts.map(item => {
              const variant = item.variants[0];
              const configured = sales.find(row => row.productHandle === item.handle);
              return (
                <button
                  key={item.id}
                  onClick={() => setHandle(item.handle)}
                  className={`flex w-full items-center gap-3 border-b border-white/10 p-3 text-left transition hover:bg-white/[.04] ${handle === item.handle ? "bg-[#e1c27a]/10" : ""}`}
                >
                  <div className="h-12 w-10 shrink-0 bg-white/10">
                    {item.images[0] && <img src={item.images[0].url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.title}</span>
                    <span className="mt-1 block font-mono text-[9px] text-white/45">
                      {configured?.salePrice ? `SALE ${configured.salePrice}` : variant ? formatMoney(variant.price) : "No price"}
                    </span>
                  </span>
                </button>
              );
            })}{filteredProducts.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 50)} className="w-full border-t border-white/10 p-3 font-mono text-[9px] tracking-[.13em] text-[#e1c27a] uppercase hover:bg-white/[.04]">Show 50 more products</button>}
          </div>
        </div>

        <form onSubmit={submit} className="border border-white/10 p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">{product ? product.title : "Select a product"}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <PriceInput label="Regular price" value={regular} onChange={setRegular} placeholder="1440" />
            <PriceInput label="Sale price" value={sale} onChange={value => { setSale(value); setPercent(""); }} placeholder="1200" />
            <PriceInput label="Or discount %" value={percent} onChange={value => { setPercent(value); setSale(""); }} placeholder="20" />
          </div>
          <p className="mt-4 text-xs leading-5 text-white/45">
            Example: regular price <strong>PKR 1,440</strong> and discount <strong>20%</strong> calculates a sale price of PKR 1,152. The bill retains both values once an order is placed.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/45">
            Removing a product hides it from the Libaas public storefront. Its Shopify source product and historical COD records remain available.
          </p>
          <p className="mt-2 text-xs leading-5 text-red-100/65">
            The stronger delete action below also permanently deletes only this product’s locally managed suit gallery. Cloudinary category images are separate assets and are never deleted by product removal unless you delete them in the Cloudinary library.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={!product || !regular || save.isPending} className="rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save sale
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!product || remove.isPending}
              onClick={() => {
                if (product && window.confirm(`Remove ${product.title} from the Libaas storefront? Its Shopify source product and past COD orders remain available.`)) {
                  remove.mutate({ adminToken, productHandle: product.handle });
                }
              }}
              className="rounded-none border-red-300/45 bg-transparent font-mono text-[10px] tracking-[.13em] text-red-200 uppercase hover:bg-red-300 hover:text-[#171417]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove from storefront
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!product || removeWithManagedMedia.isPending}
              onClick={() => {
                if (product && window.confirm(`Permanently remove ${product.title} from the public Libaas storefront and delete its attached local suit-gallery images? Historic COD orders remain protected. This does not delete unrelated Cloudinary category assets.`)) {
                  removeWithManagedMedia.mutate({ adminToken, productHandle: product.handle, confirmation: "DELETE_PRODUCT_AND_MEDIA" });
                }
              }}
              className="rounded-none border-red-300/75 bg-red-300/10 font-mono text-[10px] tracking-[.13em] text-red-100 uppercase hover:bg-red-300 hover:text-[#171417]"
            >
              {removeWithManagedMedia.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5" />
              Remove product + managed views
            </Button>
          </div>
        </form>
      </div>
    </section>,
    studioMain,
  );
}

function PriceInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">{label}</Label>
      <Input value={value} onChange={event => onChange(event.target.value)} inputMode="decimal" placeholder={placeholder} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" />
    </div>
  );
}
