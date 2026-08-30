import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { trpc } from "@/lib/trpc";
import { FolderPlus, Loader2, SlidersHorizontal, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type Kind = "color" | "style" | "season";

export function SuitFilterManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading: productsLoading } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const { data: drafts = [] } = trpc.admin.suits.list.useQuery({ adminToken });
  const { data: saved = [] } = trpc.admin.suitFilters.list.useQuery({ adminToken });
  const { data: presets = [] } = trpc.admin.filterPresets.list.useQuery({ adminToken });
  const [handle, setHandle] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [season, setSeason] = useState("");
  const suits = useMemo(() => [...products.map(product => ({ handle: product.handle, title: product.title })), ...drafts.filter(draft => !products.some(product => product.handle === draft.handle)).map(draft => ({ handle: draft.handle, title: draft.title }))], [products, drafts]);
  const selected = suits.find(suit => suit.handle === handle);
  useEffect(() => { const meta = saved.find(item => item.productHandle === handle); setColor(meta?.color ?? ""); setStyle(meta?.style ?? ""); setSeason(meta?.season ?? ""); }, [handle, saved]);
  const save = trpc.admin.suitFilters.save.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.suitFilters.list.invalidate(), utils.brand.suitFilters.invalidate()]); toast.success("Storefront filters saved for this suit."); }, onError: error => toast.error(error.message) });
  const remove = trpc.admin.suitFilters.remove.useMutation({ onSuccess: async () => { await Promise.all([utils.admin.suitFilters.list.invalidate(), utils.brand.suitFilters.invalidate()]); setColor(""); setStyle(""); setSeason(""); toast.success("Filters cleared for this suit."); }, onError: error => toast.error(error.message) });
  const root = useStudioPanelRoot();
  if (!root) return null;
  return createPortal(<section className="mt-10 border border-white/15 bg-[#181818] p-4 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Visitor filters</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Color, style, season</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Choose how this suit appears in the public catalog filters. These labels are for discovery only and do not change pricing, stock, or COD records.</p></div><SlidersHorizontal className="h-6 w-6 text-[#e1c27a]" /></div><div className="mt-6"><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">Suit</Label><select value={handle} onChange={event => setHandle(event.target.value)} className="mt-2 h-11 w-full rounded-none border border-white/20 bg-[#181818] px-3 text-sm text-white"><option value="">Select a suit</option>{suits.map(suit => <option key={suit.handle} value={suit.handle}>{suit.title}</option>)}</select></div>
    <TagField adminToken={adminToken} kind="color" label="Color" placeholder="Azure blue" value={color} setValue={setColor} presets={presets} />
    <TagField adminToken={adminToken} kind="style" label="Style" placeholder="e.g. Stitched 1-pc" value={style} setValue={setStyle} presets={presets} />
    <TagField adminToken={adminToken} kind="season" label="Season" placeholder="Spring / Summer" value={season} setValue={setSeason} presets={presets} />
    <div className="mt-5 flex gap-2"><Button type="button" disabled={!selected || !color.trim() || !style.trim() || !season.trim() || save.isPending || productsLoading} onClick={() => selected && save.mutate({ adminToken, productHandle: selected.handle, color: color.trim(), style: style.trim(), season: season.trim() })} className="h-11 flex-1 rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.12em] text-[#171417] uppercase hover:bg-white">{save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}Save filters</Button>{selected && saved.some(item => item.productHandle === selected.handle) && <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate({ adminToken, productHandle: selected.handle })} className="h-11 rounded-none border-white/25 px-4 font-mono text-[10px] tracking-[.12em] text-white/70 uppercase hover:border-red-400 hover:text-red-400">Clear</Button>}</div>
  </section>, root);
}

function TagField({ adminToken, kind, label, placeholder, value, setValue, presets }: { adminToken: string; kind: Kind; label: string; placeholder: string; value: string; setValue: (value: string) => void; presets: { id: number; kind: Kind; value: string }[] }) {
  const utils = trpc.useUtils();
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState("");
  const options = presets.filter(p => p.kind === kind);
  const addPreset = trpc.admin.filterPresets.add.useMutation({ onSuccess: async (created) => { await utils.admin.filterPresets.list.invalidate(); setValue(created.value); setNewValue(""); setCreating(false); toast.success(`"${created.value}" folder created and selected.`); }, onError: error => toast.error(error.message) });
  const removePreset = trpc.admin.filterPresets.remove.useMutation({ onSuccess: async () => { await utils.admin.filterPresets.list.invalidate(); }, onError: error => toast.error(error.message) });
  return <div className="mt-4"><Label className="font-mono text-[9px] tracking-[.13em] text-white/55 uppercase">{label}</Label>
    <div className="mt-2 flex gap-2"><select value={value} onChange={event => setValue(event.target.value)} className="h-11 flex-1 rounded-none border border-white/20 bg-[#181818] px-3 text-sm text-white"><option value="">Choose a {label.toLowerCase()} folder</option>{options.map(option => <option key={option.id} value={option.value}>{option.value}</option>)}</select><Button type="button" onClick={() => setCreating(current => !current)} className="h-11 rounded-none border border-white/25 bg-transparent px-4 font-mono text-[9px] tracking-[.1em] text-white uppercase hover:border-[#e1c27a] hover:text-[#e1c27a]"><FolderPlus className="h-3.5 w-3.5" />New</Button></div>
    {creating && <div className="mt-2 flex gap-2"><Input value={newValue} onChange={event => setNewValue(event.target.value)} className="h-10 flex-1 rounded-none border-white/20 bg-transparent text-sm text-white" placeholder={placeholder} autoFocus /><Button type="button" disabled={!newValue.trim() || addPreset.isPending} onClick={() => addPreset.mutate({ adminToken, kind, value: newValue.trim() })} className="h-10 rounded-none bg-[#e1c27a] px-4 font-mono text-[9px] tracking-[.1em] text-[#171417] uppercase hover:bg-white">{addPreset.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}</Button></div>}
    {options.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{options.map(option => <span key={option.id} className="inline-flex items-center gap-1.5 border border-white/15 px-2 py-1 font-mono text-[8px] tracking-[.06em] text-white/45 uppercase"><button type="button" onClick={() => removePreset.mutate({ adminToken, id: option.id })} aria-label={`Delete ${option.value} folder`}><X className="h-2.5 w-2.5 hover:text-red-400" /></button>{option.value}</span>)}</div>}
  </div>;
}
