import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreFooter, StoreHeader } from "@/components/StoreHeader";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Check, ChevronLeft, Loader2, PackageCheck, Truck, WalletCards } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [formError, setFormError] = useState("");
  const { data: delivery, isLoading: deliveryLoading } = trpc.brand.delivery.useQuery();
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: receipt => {
      if (!receipt) return;
      localStorage.setItem(`libass:receipt-email:${receipt.orderNumber}`, receipt.email);
      clearCart();
      navigate(`/receipt/${receipt.orderNumber}`);
    },
    onError: error => setFormError(error.message),
  });
  const deliveryFee = delivery?.freeDelivery ? 0 : Number(delivery?.deliveryFee ?? 0);
  const total = useMemo(() => Number(cart?.subtotal.amount ?? 0) + deliveryFee, [cart?.subtotal.amount, deliveryFee]);
  const money = (amount: number | string) => formatMoney({ amount: String(amount), currencyCode: cart?.total.currencyCode ?? "PKR" });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart?.id || !cart.items.length) { setFormError("Your bag is empty. Add a piece before checking out."); return; }
    const data = new FormData(event.currentTarget);
    setFormError("");
    createOrder.mutate({ cartId: cart.id, customerName: String(data.get("customerName") ?? ""), email: String(data.get("email") ?? ""), phone: String(data.get("phone") ?? ""), addressLine1: String(data.get("addressLine1") ?? ""), addressLine2: String(data.get("addressLine2") ?? "") || undefined, city: String(data.get("city") ?? ""), postalCode: String(data.get("postalCode") ?? "") || undefined, paymentMethod: "cod" });
  }

  if (!cart?.items.length) return <EmptyCheckout />;
  return (
    <div className="min-h-screen bg-[#171417] text-white">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-7 sm:px-8 lg:pt-12">
        <Link href="/shop" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-white/55 uppercase hover:text-[#e1c27a]"><ChevronLeft className="h-4 w-4" />Back to the drop</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_.78fr] lg:gap-16">
          <form onSubmit={submit} className="max-w-2xl">
            <p className="eyebrow">Private checkout / COD</p>
            <h1 className="mt-3 font-display text-5xl leading-[.9] sm:text-6xl">FINAL<br /><span className="text-white/35">COORDINATES.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/55">Confirm your delivery details. Your email, phone number, address, pieces, delivery charge, and order total are stored privately in the Libaas by HAYA studio for fulfillment.</p>
            <section className="mt-10 border-t border-white/15 pt-7"><h2 className="font-display text-3xl">Delivery details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Full name" name="customerName" placeholder="Your name" /><Field label="Email" name="email" type="email" placeholder="you@example.com" /><Field label="Phone" name="phone" type="tel" placeholder="03XX XXXXXXX" /><Field label="City" name="city" placeholder="Your city" /><div className="sm:col-span-2"><Field label="Address" name="addressLine1" placeholder="House, street, area" /></div><div className="sm:col-span-2"><Field label="Apartment / suite (optional)" name="addressLine2" placeholder="Optional" required={false} /></div><Field label="Postal code (optional)" name="postalCode" placeholder="Optional" required={false} /></div></section>
            <section className="mt-10 border-t border-white/15 pt-7"><h2 className="font-display text-3xl">Payment method</h2><div className="mt-5 flex items-start gap-4 border border-[#e1c27a]/40 bg-[#e1c27a]/10 p-5"><span className="border border-[#e1c27a]/40 p-2"><WalletCards className="h-4 w-4 text-[#e1c27a]" /></span><div><p className="font-mono text-[10px] tracking-[.15em] text-[#e1c27a] uppercase">Cash on Delivery only</p><p className="mt-2 text-xs leading-5 text-white/65">Please keep the exact order total ready when your Libaas by HAYA order arrives. No online payment and no card data collection.</p></div></div></section>
            {formError && <p className="mt-5 flex items-start gap-2 text-sm leading-5 text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</p>}
            <Button type="submit" disabled={createOrder.isPending || deliveryLoading} className="mt-9 h-13 w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.16em] text-[#171417] uppercase hover:bg-white">{createOrder.isPending || deliveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Place Cash-on-Delivery order</Button>
          </form>
          <aside className="h-fit border border-white/15 bg-[#181818] p-6 lg:sticky lg:top-24"><p className="eyebrow">Order record</p><div className="mt-5 divide-y divide-white/10">{cart.items.map(item => <article key={item.lineId} className="flex gap-3 py-4 first:pt-0"><div className="h-20 w-16 shrink-0 overflow-hidden bg-white/10">{item.image && <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.productTitle}</p>{item.variantTitle !== "Default Title" && <p className="mt-1 font-mono text-[10px] text-white/45">{item.variantTitle}</p>}<p className="mt-3 font-mono text-[10px] text-white/45">Qty {item.quantity}</p>{item.salePrice && <p className="mt-2 font-mono text-[9px] tracking-[.1em] text-[#e1c27a] uppercase">Sale applied</p>}<div className="mt-1 flex gap-2 font-mono text-[10px]">{item.regularPrice && <span className="text-white/40 line-through">{formatMoney(item.regularPrice)}</span>}<span className={item.salePrice ? "text-[#e1c27a]" : "text-white/65"}>{formatMoney(item.unitPrice)} each</span></div></div><p className="font-mono text-xs">{formatMoney(item.lineTotal)}</p></article>)}</div><div className="mt-5 border-t border-white/15 pt-5"><div className="flex items-center justify-between font-mono text-xs text-white/55"><span>SUBTOTAL</span><span>{formatMoney(cart.subtotal)}</span></div><div className="mt-3 flex items-center justify-between font-mono text-xs text-white/55"><span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-[#e1c27a]" />DELIVERY</span><span>{deliveryLoading ? "Calculating" : delivery?.freeDelivery ? <strong className="font-mono text-[#e1c27a]">FREE</strong> : money(deliveryFee)}</span></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 font-display text-3xl"><span>TOTAL</span><span>{money(total)}</span></div><p className="mt-4 font-mono text-[9px] leading-5 tracking-[.08em] text-white/45 uppercase">{delivery?.freeDelivery ? "Free delivery has been applied by Libaas by HAYA." : "Delivery is added once per order and preserved on the final COD receipt."}</p></div></aside>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}

function EmptyCheckout() { return <div className="min-h-screen bg-[#171417] text-white"><StoreHeader /><main className="kinetic-grid mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><PackageCheck className="h-8 w-8 text-[#e1c27a]" /><p className="mt-5 font-mono text-[10px] tracking-[.16em] text-[#e1c27a] uppercase">Checkout / no items</p><h1 className="mt-3 font-display text-5xl leading-[.88]">YOUR BAG<br />IS WAITING.</h1><p className="mt-5 text-sm leading-6 text-white/55">Add a considered piece before creating a Cash on Delivery order.</p><Button asChild className="mt-8 rounded-none bg-[#e1c27a] px-7 font-mono text-[10px] tracking-[.14em] text-[#171417] uppercase hover:bg-white"><Link href="/shop">Explore the drop</Link></Button></main><StoreFooter /></div>; }
function Field({ label, name, placeholder, type = "text", required = true }: { label: string; name: string; placeholder: string; type?: string; required?: boolean }) { return <div><Label htmlFor={name} className="font-mono text-[10px] tracking-[.13em] text-white/65 uppercase">{label}</Label><Input id={name} name={name} type={type} required={required} placeholder={placeholder} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white placeholder:text-white/25 focus-visible:ring-[#e1c27a]" /></div>; }
