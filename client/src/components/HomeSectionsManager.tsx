import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { trpc } from "@/lib/trpc";
import { Layers, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function HomeSectionsManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: sections = [] } = trpc.admin.homeSections.list.useQuery({ adminToken });
  const { data: suits = [] } = trpc.admin.suits.published.useQuery({ adminToken });
  const [newTitle, setNewTitle] = useState("");
  const create = trpc.admin.homeSections.create.useMutation({ onSuccess: async () => { setNewTitle(""); await utils.admin.homeSections.list.invalidate(); toast.success("Section created."); }, onError: error => toast.error(error.message) });
  const removeSection = trpc.admin.homeSections.remove.useMutation({ onSuccess: async () => { await utils.admin.homeSections.list.invalidate(); toast.success("Section removed."); }, onError: error => toast.error(error.message) });
  const removeItem = trpc.admin.homeSections.removeItem.useMutation({ onSuccess: async () => { await utils.admin.homeSections.list.invalidate(); }, onError: error => toast.error(error.message) });
  const root = useStudioPanelRoot(); if (!root) return null;

  return createPortal(<section className="mt-10 border border-[#e1c27a]/30 bg-[#181818] p-4 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Homepage sections</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Build your own rows</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Create any horizontal-scroll row you want on the homepage — "New Arrivals", "Best Sellers", anything — then upload images to it, optionally linking each to a product.</p></div><Layers className="h-6 w-6 text-[#e1c27a]" /></div>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="e.g. Best Sellers" className="h-11 flex-1 rounded-none border-white/20 bg-transparent text-white" /><Button type="button" disabled={!newTitle.trim() || create.isPending} onClick={() => create.mutate({ adminToken, title: newTitle.trim() })} className="h-11 rounded-none bg-[#e1c27a] px-5 font-mono text-[10px] tracking-[.12em] text-[#171417] uppercase hover:bg-white">{create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create section</Button></div>
    <div className="mt-8 space-y-8">{sections.map(section => <SectionEditor key={section.id} adminToken={adminToken} section={section} suits={suits} onRemoveSection={() => removeSection.mutate({ adminToken, id: section.id })} onRemoveItem={id => removeItem.mutate({ adminToken, id })} />)}</div>
  </section>, root);
}

function SectionEditor({ adminToken, section, suits, onRemoveSection, onRemoveItem }: { adminToken: string; section: any; suits: any[]; onRemoveSection: () => void; onRemoveItem: (id: number) => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(""); const [linkHandle, setLinkHandle] = useState(""); const [file, setFile] = useState<File | null>(null);
  const addItem = trpc.admin.homeSections.addItem.useMutation({ onSuccess: async () => { setTitle(""); setLinkHandle(""); setFile(null); await utils.admin.homeSections.list.invalidate(); toast.success("Image added."); }, onError: error => toast.error(error.message) });
  const upload = () => { if (!file) return; const reader = new FileReader(); reader.onload = () => { const dataUrl = String(reader.result); addItem.mutate({ adminToken, sectionId: section.id, title, linkProductHandle: linkHandle || undefined, fileName: file.name, mimeType: file.type as any, dataUrl }); }; reader.readAsDataURL(file); };
  return <div className="border border-white/15 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{section.title}</h3><button type="button" onClick={onRemoveSection} className="inline-flex items-center gap-1.5 border border-white/20 px-2.5 py-1.5 font-mono text-[9px] tracking-[.1em] text-white/60 uppercase hover:border-red-400 hover:text-red-400"><Trash2 className="h-3 w-3" />Delete section</button></div>
    {section.items.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{section.items.map((item: any) => <div key={item.id} className="relative h-24 w-20 overflow-hidden border border-white/15"><img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /><button type="button" onClick={() => onRemoveItem(item.id)} aria-label="Remove image" className="absolute right-1 top-1 bg-[#171417]/85 p-1 text-white hover:bg-red-500"><Trash2 className="h-3 w-3" /></button></div>)}</div>}
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Caption (optional)" className="h-10 rounded-none border-white/20 bg-transparent text-sm text-white" /><select value={linkHandle} onChange={event => setLinkHandle(event.target.value)} className="h-10 rounded-none border border-white/20 bg-[#181818] px-2 text-sm text-white"><option value="">No link (decorative)</option>{suits.map(suit => <option key={suit.productHandle} value={suit.productHandle}>{suit.title}</option>)}</select><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} className="h-10 rounded-none border-white/20 bg-transparent text-xs text-white" /><Button type="button" disabled={!file || addItem.isPending} onClick={upload} className="h-10 rounded-none bg-[#e1c27a] px-4 font-mono text-[9px] tracking-[.1em] text-[#171417] uppercase hover:bg-white">{addItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Add</Button></div>
  </div>;
}
