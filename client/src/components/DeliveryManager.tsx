import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function DeliveryManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: delivery, isLoading } = trpc.admin.delivery.get.useQuery({ adminToken });
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0");
  useEffect(() => { if (delivery) { setFreeDelivery(delivery.freeDelivery); setDeliveryFee(delivery.deliveryFee); } }, [delivery?.freeDelivery, delivery?.deliveryFee]);
  const save = trpc.admin.delivery.update.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.delivery.get.invalidate(), utils.brand.delivery.invalidate()]); toast.success(freeDelivery ? "Free delivery is now active for future orders." : "Delivery fee saved for future COD orders."); }, onError: error => toast.error(error.message) });
  const studioMain = document.querySelector("main");
  if (!studioMain) return null;
  return createPortal(<section className="mt-10 border border-white/15 bg-[#181818] p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Delivery control</p><h2 className="mt-2 font-display text-4xl">One delivery rule, every bill</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Set one delivery charge for each complete order, or switch on free delivery. New COD checkout totals, receipts, and Studio order records keep the exact rule that applied at checkout.</p></div><Truck className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-7 grid gap-5 border border-white/10 p-5 sm:grid-cols-[1fr_auto]"><div><Label htmlFor="delivery-fee" className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Delivery fee per order (PKR)</Label><Input id="delivery-fee" value={deliveryFee} onChange={event => setDeliveryFee(event.target.value)} inputMode="decimal" disabled={freeDelivery || isLoading} className="mt-2 h-11 max-w-sm rounded-none border-white/20 bg-transparent text-white disabled:opacity-45" placeholder="250" /><p className="mt-2 text-xs text-white/45">The fee is added once to the whole order, not once per clothing item.</p></div><label className="flex cursor-pointer items-center gap-3 self-start border border-[#e1c27a]/35 bg-[#e1c27a]/10 px-4 py-3 text-sm"><input type="checkbox" checked={freeDelivery} onChange={event => setFreeDelivery(event.target.checked)} className="h-4 w-4 accent-[#e1c27a]" />Free delivery</label></div><Button type="button" onClick={() => save.mutate({ adminToken, freeDelivery, deliveryFee: freeDelivery ? "0" : deliveryFee || "0" })} disabled={isLoading || save.isPending} className="mt-5 rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save delivery rule</Button></section>, studioMain);
}
