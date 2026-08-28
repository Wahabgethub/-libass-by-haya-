import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const MAX_SUIT_VIEWS = 6;
const REQUIRED_VIEWS = ["front", "back", "detail"] as const;
const VIEW_LABELS = ["front", "back", "detail", "editorial", "other", "other"] as const;
type ViewLabel = (typeof VIEW_LABELS)[number];
type SuitChoice = { id: string | number; handle: string; title: string; imageUrl?: string; source: "catalog" | "studio" };
const makeHandle = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function ProductMediaManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading: productsLoading } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const { data: drafts = [], isLoading: draftsLoading } = trpc.admin.suits.list.useQuery({ adminToken });
  const [handle, setHandle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [newSuitTitle, setNewSuitTitle] = useState("");
  const [newSuitHandle, setNewSuitHandle] = useState("");
  const [uploading, setUploading] = useState(false);
  const catalogSuits = useMemo<SuitChoice[]>(() => products.map(item => ({ id: item.id, handle: item.handle, title: item.title, imageUrl: item.images[0]?.url, source: "catalog" })), [products]);
  const allSuits = useMemo<SuitChoice[]>(() => [...catalogSuits, ...drafts.filter(draft => !catalogSuits.some(item => item.handle === draft.handle)).map(draft => ({ id: `studio-${draft.id}`, handle: draft.handle, title: draft.title, source: "studio" as const }))], [catalogSuits, drafts]);
  const suit = useMemo(() => allSuits.find(item => item.handle === handle), [allSuits, handle]);
  const filteredSuits = useMemo(() => allSuits.filter(item => `${item.title} ${item.handle}`.toLowerCase().includes(search.toLowerCase())), [allSuits, search]);
  const visibleSuits = filteredSuits.slice(0, visibleCount);
  const { data: queriedMedia = [], isLoading: mediaLoading } = trpc.admin.media.list.useQuery({ adminToken, productHandle: handle || "not-selected" }, { enabled: Boolean(handle) });
  const media = useMemo(() => queriedMedia.filter(item => item.productHandle === handle).slice(0, MAX_SUIT_VIEWS), [queriedMedia, handle]);
  const nextLabel = VIEW_LABELS[media.length] as ViewLabel | undefined;
  const remainingSlots = MAX_SUIT_VIEWS - media.length;
  const batchLabels = VIEW_LABELS.slice(media.length, media.length + Math.min(files.length, remainingSlots));
  const ready = media.length >= REQUIRED_VIEWS.length;
  const createSuit = trpc.admin.suits.create.useMutation({ onSuccess: async created => { await utils.admin.suits.list.invalidate(); setHandle(created.handle); setNewSuitTitle(""); setNewSuitHandle(""); setFiles([]); toast.success("Suit created. Choose its Front image first."); }, onError: error => toast.error(error.message) });
  const remove = trpc.admin.media.remove.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.media.list.invalidate(), utils.commerce.products.invalidate()]); toast.success("View removed from this suit only."); }, onError: error => toast.error(error.message) });

  async function uploadNext() {
    if (!suit || !files.length || !batchLabels.length) { toast.error("Choose a suit and at least one image first."); return; }
    if (files.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type))) { toast.error("Use JPG, PNG, or WebP images only."); return; }
    if (files.some(f => f.size > 8 * 1024 * 1024)) { toast.error("Each image must be smaller than 8 MB."); return; }
    setUploading(true);
    try {
      const usedFiles = files.slice(0, batchLabels.length);
      const form = new FormData();
      form.append("adminToken", adminToken); form.append("productHandle", suit.handle); form.append("title", suit.title); form.append("altText", `${suit.title} view`); form.append("sortOrder", String(media.length)); form.append("viewLabels", JSON.stringify(batchLabels));
      usedFiles.forEach(f => form.append("files", f));
      const response = await fetch("/api/admin/local-media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({ message: "The local image server returned an unexpected response." }));
      if (!response.ok) throw new Error(result.message || "Garment images could not be saved.");
      await Promise.all([utils.admin.media.list.invalidate(), utils.commerce.products.invalidate()]);
      setFiles([]);
      const newTotal = media.length + usedFiles.length;
      toast.success(newTotal >= REQUIRED_VIEWS.length ? `${suit.title} is ready with Front, Back, and Detail.` : `${usedFiles.length} view(s) saved. Add ${VIEW_LABELS[newTotal]?.toUpperCase()} next.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Garment images could not be saved."); } finally { setUploading(false); }
  }

  const root = useStudioPanelRoot();
  if (!root) return null;
  return createPortal(<section className="mt-10 border border-[#e1c27a]/30 bg-[#181818] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Suit gallery manager</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Add each suit view simply</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Create or select a suit, then choose one or several images at once (up to 6 total). They're saved in order as Front, Back, Detail, then editorial views.</p></div><ImagePlus className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-6 border border-[#e1c27a]/25 bg-[#e1c27a]/[.06] p-4"><p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">Step 1 / Add new suit</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={newSuitTitle} onChange={event => { setNewSuitTitle(event.target.value); if (!newSuitHandle) setNewSuitHandle(makeHandle(event.target.value)); }} className="h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Suit name, e.g. Midnight Rose" /><Input value={newSuitHandle} onChange={event => setNewSuitHandle(makeHandle(event.target.value))} className="h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="midnight-rose" /><Button type="button" disabled={!newSuitTitle.trim() || !newSuitHandle.trim() || createSuit.isPending} onClick={() => createSuit.mutate({ adminToken, title: newSuitTitle.trim(), handle: makeHandle(newSuitHandle) })} className="h-11 rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{createSuit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create suit</Button></div></div><div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="border border-white/10"><div className="border-b border-white/10 px-4 py-3 font-mono text-[9px] tracking-[.14em] text-white/45 uppercase">Step 2 / Select suit</div><div className="border-b border-white/10 p-3"><Input value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(50); }} className="h-9 rounded-none border-white/15 bg-transparent text-sm text-white" placeholder="Search suit name" /></div><div className="max-h-80 overflow-y-auto">{productsLoading || draftsLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-[#e1c27a]" /></div> : <>{visibleSuits.map(item => <button key={item.id} type="button" onClick={() => { setHandle(item.handle); setFiles([]); }} className={`flex w-full items-center gap-3 border-b border-white/10 p-3 text-left transition hover:bg-white/[.04] ${handle === item.handle ? "bg-[#e1c27a]/10" : ""}`}><div className="h-12 w-10 shrink-0 bg-white/10">{item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm">{item.title}</span><span className="mt-1 block font-mono text-[9px] text-white/45 uppercase">{item.source === "studio" ? "Studio suit" : "Catalog suit"}</span></span></button>)}{filteredSuits.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 50)} className="w-full p-3 font-mono text-[9px] tracking-[.13em] text-[#e1c27a] uppercase">Show 50 more suits</button>}</>}</div></div><div className="border border-white/10 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">{suit ? suit.title : "Choose a suit"}</p>{suit && <span className={`border px-2 py-1 font-mono text-[9px] tracking-[.12em] uppercase ${ready ? "border-emerald-300/45 text-emerald-200" : "border-[#e1c27a]/35 text-[#e1c27a]"}`}>{ready ? "Ready: Front · Back · Detail" : `Next: ${nextLabel?.toUpperCase()}`}</span>}</div><p className="mt-2 font-mono text-[9px] tracking-[.12em] text-white/45 uppercase">{media.length} / {MAX_SUIT_VIEWS} saved views</p><div className={`mt-5 min-h-36 border border-dashed px-4 py-5 text-center ${suit && nextLabel && !uploading ? "border-white/25 hover:border-[#e1c27a]" : "pointer-events-none border-white/10 opacity-45"}`}><Upload className="mx-auto h-5 w-5 text-[#e1c27a]" /><Label htmlFor="garment-view-file" className="mt-2 block font-mono text-[10px] tracking-[.13em] text-white uppercase">{files.length ? `${files.length} image(s) selected` : `Choose ${nextLabel?.toUpperCase() ?? "a suit"} image(s)`}</Label><span className="mt-1 block text-xs text-white/45">Select up to {remainingSlots} at once · JPG, PNG, or WebP · max 8 MB each</span><input id="garment-view-file" type="file" multiple accept="image/jpeg,image/png,image/webp" className="mx-auto mt-4 block max-w-full text-xs text-white file:mr-3 file:border-0 file:bg-[#e1c27a] file:px-3 file:py-2 file:font-mono file:text-[9px] file:tracking-[.1em] file:text-[#171417]" onChange={(event: ChangeEvent<HTMLInputElement>) => setFiles(Array.from(event.target.files ?? []).slice(0, remainingSlots))} /></div>{batchLabels.length > 0 && <p className="mt-2 font-mono text-[8px] tracking-[.1em] text-[#e1c27a] uppercase">Will be saved as: {batchLabels.join(", ")}</p>}<Button type="button" onClick={uploadNext} disabled={!suit || !files.length || !nextLabel || uploading} className="mt-4 w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Save {files.length > 1 ? `${files.length} images` : (nextLabel?.toUpperCase() ?? "view")}</Button><div className="mt-6 border-t border-white/10 pt-4"><p className="font-mono text-[9px] tracking-[.13em] text-white/45 uppercase">This suit only</p>{!handle ? <p className="mt-3 text-sm text-white/45">Create or select a suit to begin.</p> : mediaLoading ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-[#e1c27a]" /> : media.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{media.map((item, index) => <article key={item.id} className="flex gap-3 border border-white/10 p-2"><img src={item.imageUrl} alt={item.altText ?? item.title} className="h-20 w-16 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="mt-1 font-mono text-[9px] tracking-[.12em] text-[#e1c27a] uppercase">{index + 1} / {MAX_SUIT_VIEWS} · {item.viewLabel}</p><button type="button" onClick={() => remove.mutate({ adminToken, id: item.id })} className="mt-2 inline-flex items-center gap-1 text-xs text-red-200 hover:text-red-100"><Trash2 className="h-3 w-3" />Remove</button></div></article>)}</div> : <p className="mt-3 text-sm text-white/45">No images yet. Start with one Front image.</p>}</div></div></div></section>, root);
}
