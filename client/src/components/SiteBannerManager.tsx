import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { Loader2, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function SiteBannerManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: banner, isLoading } = trpc.admin.siteBanner.get.useQuery({ adminToken });
  const [saleMessage, setSaleMessage] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  useEffect(() => { if (banner) { setSaleMessage(banner.saleMessage); setDeliveryMessage(banner.deliveryMessage); } }, [banner?.saleMessage, banner?.deliveryMessage]);
  const save = trpc.admin.siteBanner.update.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.siteBanner.get.invalidate(), utils.brand.siteBanner.invalidate()]); toast.success("Site banner updated."); }, onError: error => toast.error(error.message) });
  const studioMain = useStudioPanelRoot();
  if (!studioMain) return null;
  return createPortal(<section className="mt-10 border border-[#e1c27a]/30 bg-[#181818] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Site-wide advertising</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Sale & delivery banner</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">This text shows in a bar at the very top of every page on the website, in your own words. Leave a box empty to hide that message. This is separate from each suit's real price and stock — write whatever you want here.</p></div><Megaphone className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Sale message</Label><Input value={saleMessage} onChange={event => setSaleMessage(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="SALE UPTO 60% OFF" /></div><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Delivery message</Label><Input value={deliveryMessage} onChange={event => setDeliveryMessage(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="FREE DELIVERY ALL OVER PAKISTAN" /></div></div><Button type="button" disabled={isLoading || save.isPending} onClick={() => save.mutate({ adminToken, saleMessage, deliveryMessage })} className="mt-5 h-11 rounded-none bg-[#e1c27a] px-6 font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save banner</Button></section>, studioMain);
}
