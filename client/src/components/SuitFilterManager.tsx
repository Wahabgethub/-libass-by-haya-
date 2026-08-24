import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { trpc } from "@/lib/trpc";
import { Loader2, SlidersHorizontal, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function SuitFilterManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading: productsLoading } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const { data: drafts = [] } = trpc.admin.suits.list.useQuery({ adminToken });
  const { data: saved = [] } = trpc.admin.suitFilters.list.useQuery({ adminToken });
  const [handle, setHandle] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [season, setSeason] = useState("");
  const suits = useMemo(() => [...products.map(product => ({ handle: product.handle, title: product.title })), ...drafts.filter(draft => !products.some(product => product.handle === draft.handle)).map(draft => ({ handle: draft.handle, title: draft.title }))], [products, drafts]);
  const selected = suits.find(suit => suit.handle === handle);
  useEffect(() => { const meta = saved.find(item => item.productHandle === handle); setColor(meta?.color ?? ""); setStyle(meta?.style ?? ""); setSeason(meta?.season ?? ""); }, [handle, saved]);
  const save = trpc.admin.suitFilters.save.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.suitFilters.list.invalidate(), utils.brand.suitFilters.invalidate()]); toast.success("Storefront filters saved for this suit."); }, onError: error => toast.error(error.message) });
  const root = useStudioPanelRoot();
  if (!root) return null;
  return createPortal(<section className="mt-10 border border-white/15 bg-[#181818] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Visitor filters</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Color, style, season</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Choose how this suit appears in the public catalog filters. These labels are for discovery only and do not change pricing, stock, or COD records.</p></div><SlidersHorizontal className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-6 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Suit</Label><select value={handle} onChange={event => setHandle(event.target.value)} className="mt-2 h-11 w-full rounded-none border border-white/20 bg-[#181818] px-3 text-sm text-white"><option value="">Select a suit</option>{suits.map(suit => <option key={suit.handle} value={suit.handle}>{suit.title}</option>)}</select></div><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Color</Label><Input value={color} onChange={event => setColor(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Azure blue" /></div><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Style</Label><Input value={style} onChange={event => setStyle(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Three-piece suit" /></div><div><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Season</Label><Input value={season} onChange={event => setSeason(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Spring / Summer" /></div><Button type="button" disabled={!selected || !color.trim() || !style.trim() || !season.trim() || save.isPending || productsLoading} onClick={() => selected && save.mutate({ adminToken, productHandle: selected.handle, color: color.trim(), style: style.trim(), season: season.trim() })} className="mt-auto h-11 rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.12em] text-[#171417] uppercase hover:bg-white">{save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}Save filters</Button></div></section>, root);
}
