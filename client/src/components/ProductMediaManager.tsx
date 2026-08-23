import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const viewOptions = ["front", "back", "detail", "editorial", "other"] as const;
type ViewLabel = typeof viewOptions[number];

export function ProductMediaManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading: productsLoading } = trpc.commerce.products.list.useQuery({ first: 1000 });
  const [handle, setHandle] = useState("");
  const [viewLabel, setViewLabel] = useState<ViewLabel>("front");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const product = useMemo(() => products.find(item => item.handle === handle), [products, handle]);
  const filteredProducts = useMemo(() => products.filter(item => `${item.title} ${item.handle}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const { data: media = [], isLoading: mediaLoading } = trpc.admin.media.list.useQuery({ adminToken, productHandle: handle || "not-selected" }, { enabled: Boolean(handle) });

  const [uploading, setUploading] = useState(false);
  const remove = trpc.admin.media.remove.useMutation({
    onSuccess: async () => { await Promise.all([utils.admin.media.list.invalidate(), utils.commerce.products.invalidate()]); toast.success("Garment view removed from the gallery."); },
    onError: error => toast.error(error.message),
  });

  async function submit() {
    if (!product || !file) { toast.error("Select a product and image first."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Use a JPG, PNG, or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Choose an image smaller than 8 MB."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("adminToken", adminToken); form.append("productHandle", product.handle); form.append("title", title.trim() || `${product.title} ${viewLabel} view`); form.append("viewLabel", viewLabel); form.append("altText", altText.trim() || `${product.title} ${viewLabel} view`); form.append("sortOrder", String(media.length)); form.append("file", file);
      const response = await fetch("/api/admin/local-media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({ message: "The local image server returned an unexpected response." }));
      if (!response.ok) throw new Error(result.message || "Garment image could not be saved locally.");
      await Promise.all([utils.admin.media.list.invalidate(), utils.commerce.products.invalidate()]);
      setFile(null); setTitle(""); setAltText("");
      toast.success("Garment view saved locally and added to the product gallery.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Garment image could not be saved locally."); }
    finally { setUploading(false); }
  }

  const studioMain = document.querySelector("main");
  if (!studioMain) return null;
  return createPortal(
    <section className="mt-10 border border-[#e1c27a]/30 bg-[#181818] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Garment view manager</p>
          <h2 className="mt-2 font-display text-4xl">Front, back & detail images</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Choose a product, then add each clothing angle you want customers to scroll through. Images are saved in this downloaded project’s local <code className="text-[#e1c27a]">data/uploads</code> folder, so this workflow does not require Cloudinary.</p>
        </div>
        <ImagePlus className="h-6 w-6 text-[#e1c27a]" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="border border-white/10">
          <div className="border-b border-white/10 px-4 py-3 font-mono text-[9px] tracking-[.14em] text-white/45 uppercase">Catalog products / {filteredProducts.length} available</div>
          <div className="border-b border-white/10 p-3"><Input value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(50); }} className="h-9 rounded-none border-white/15 bg-transparent text-sm text-white" placeholder="Search product name" /></div>
          <div className="max-h-80 overflow-y-auto">{productsLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-[#e1c27a]" /></div> : <>{visibleProducts.map(item => <button key={item.id} onClick={() => setHandle(item.handle)} className={`flex w-full items-center gap-3 border-b border-white/10 p-3 text-left transition hover:bg-white/[.04] ${handle === item.handle ? "bg-[#e1c27a]/10" : ""}`}><div className="h-12 w-10 bg-white/10">{item.images[0] && <img src={item.images[0].url} alt="" className="h-full w-full object-cover" />}</div><span className="min-w-0 flex-1 truncate text-sm">{item.title}</span></button>)}{filteredProducts.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 50)} className="w-full border-b border-white/10 p-3 font-mono text-[9px] tracking-[.13em] text-[#e1c27a] uppercase hover:bg-white/[.04]">Show 50 more products</button>}</>}</div>
        </div>

        <div className="border border-white/10 p-5">
          <p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">{product ? product.title : "Select a product"}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">View label</Label><select value={viewLabel} onChange={event => setViewLabel(event.target.value as ViewLabel)} className="mt-2 h-11 w-full border border-white/20 bg-[#181818] px-3 text-sm text-white">{viewOptions.map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></div>
            <div><Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">Display name</Label><Input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Azure Garden back view" /></div>
            <div className="sm:col-span-2"><Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">Accessibility description</Label><Input value={altText} onChange={event => setAltText(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Azure Garden three-piece suit from the back" /></div>
          </div>
          <div className={`mt-5 min-h-36 border border-dashed px-4 py-5 text-center ${product && !uploading ? "border-white/25 hover:border-[#e1c27a]" : "pointer-events-none border-white/10 opacity-45"}`}><Upload className="mx-auto h-5 w-5 text-[#e1c27a]" /><Label htmlFor="garment-view-file" className="mt-2 block font-mono text-[10px] tracking-[.13em] text-white uppercase">{file ? file.name : "Choose a garment image"}</Label><span className="mt-1 block text-xs text-white/45">JPG, PNG, or WebP · maximum 8 MB</span><input id="garment-view-file" type="file" accept="image/jpeg,image/png,image/webp" className="mx-auto mt-4 block max-w-full text-xs text-white file:mr-3 file:border-0 file:bg-[#e1c27a] file:px-3 file:py-2 file:font-mono file:text-[9px] file:tracking-[.1em] file:text-[#171417]" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} /></div>
          <Button type="button" onClick={submit} disabled={!product || !file || uploading} className="mt-4 w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Save garment view</Button>
          <div className="mt-6 border-t border-white/10 pt-4"><p className="font-mono text-[9px] tracking-[.13em] text-white/45 uppercase">Current selected views</p>{!handle ? <p className="mt-3 text-sm text-white/45">Select a product to manage its gallery.</p> : mediaLoading ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-[#e1c27a]" /> : media.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{media.map(item => <article key={item.id} className="flex gap-3 border border-white/10 p-2"><img src={item.imageUrl} alt={item.altText ?? item.title} className="h-20 w-16 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="mt-1 font-mono text-[9px] tracking-[.12em] text-[#e1c27a] uppercase">{item.viewLabel}</p><button onClick={() => remove.mutate({ adminToken, id: item.id })} className="mt-2 inline-flex items-center gap-1 text-xs text-red-200 hover:text-red-100"><Trash2 className="h-3 w-3" />Remove</button></div></article>)}</div> : <p className="mt-3 text-sm text-white/45">No local views yet. Add front, back, and any detail angles you want to show.</p>}</div>
        </div>
      </div>
    </section>,
    studioMain,
  );
}
