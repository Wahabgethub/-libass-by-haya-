import { Button } from "@/components/ui/button";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { trpc } from "@/lib/trpc";
import { GripVertical, Loader2, MoveVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function EditorialDragReorder({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [] } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const { data: drafts = [] } = trpc.admin.suits.list.useQuery({ adminToken });
  const [handle, setHandle] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const suits = useMemo(() => [...products.map(item => ({ handle: item.handle, title: item.title })), ...drafts.filter(item => !products.some(product => product.handle === item.handle)).map(item => ({ handle: item.handle, title: item.title }))], [products, drafts]);
  const { data: media = [], isLoading } = trpc.admin.media.list.useQuery({ adminToken, productHandle: handle || "not-selected" }, { enabled: Boolean(handle) });
  const extras = media.slice(3);
  const reorder = trpc.admin.media.reorder.useMutation({ onSuccess: async () => { await utils.admin.media.list.invalidate(); toast.success("Extra editorial views reordered."); }, onError: error => toast.error(error.message) });
  const moveExtra = (targetId: number) => { if (!handle || draggedId === null || draggedId === targetId || reorder.isPending) return; const fixed = media.slice(0, 3); const orderedExtras = extras.slice(); const from = orderedExtras.findIndex(item => item.id === draggedId); const to = orderedExtras.findIndex(item => item.id === targetId); if (from < 0 || to < 0) return; const [dragged] = orderedExtras.splice(from, 1); orderedExtras.splice(to, 0, dragged!); reorder.mutate({ adminToken, productHandle: handle, ids: [...fixed, ...orderedExtras].map(item => item.id) }); setDraggedId(null); };
  const root = useStudioPanelRoot();
  if (!root) return null;
  return createPortal(<section className="mt-10 border border-white/15 bg-[#181818] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Editorial order</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Drag extra views into place</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Front, back, and detail stay locked as the first three views. Drag only the fourth, fifth, and sixth editorial or other views to change their customer order.</p></div><MoveVertical className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-6"><label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Select suit</label><select value={handle} onChange={event => setHandle(event.target.value)} className="mt-2 h-11 w-full max-w-xl rounded-none border border-white/20 bg-[#181818] px-3 text-sm text-white"><option value="">Select a suit</option>{suits.map(suit => <option key={suit.handle} value={suit.handle}>{suit.title}</option>)}</select></div>{!handle ? <p className="mt-6 text-sm text-white/45">Select a suit with extra views to reorder.</p> : isLoading ? <Loader2 className="mt-6 h-5 w-5 animate-spin text-[#e1c27a]" /> : extras.length ? <div className="mt-6 grid gap-3 sm:grid-cols-3">{extras.map((item, index) => <article key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragOver={event => event.preventDefault()} onDrop={() => moveExtra(item.id)} className={`cursor-grab border p-3 active:cursor-grabbing ${draggedId === item.id ? "border-[#e1c27a] bg-[#e1c27a]/10 opacity-60" : "border-white/15 bg-white/[.02]"}`}><img src={item.imageUrl} alt={item.altText ?? item.title} className="aspect-[4/5] w-full object-cover" /><div className="mt-3 flex items-center gap-2"><GripVertical className="h-4 w-4 shrink-0 text-[#e1c27a]" /><div className="min-w-0"><p className="truncate text-sm">{item.title}</p><p className="font-mono text-[9px] tracking-[.11em] text-white/45 uppercase">Extra view {index + 1} · drag to reorder</p></div></div></article>)}</div> : <div className="mt-6 border border-dashed border-white/15 p-5 text-sm text-white/45">This suit has no extra editorial views yet. Add a fourth image in the Suit gallery manager, then return here to drag it into order.</div>}</section>, root);
}
