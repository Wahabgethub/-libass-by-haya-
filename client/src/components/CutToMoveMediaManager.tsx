import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { ArrowLeft, ArrowRight, Loader2, Move3D, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const MAX_MOTION_FRAMES = 6;

export function CutToMoveMediaManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: motion = [], isLoading } = trpc.admin.motion.list.useQuery({ adminToken });
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const frames = useMemo(() => motion.slice(0, MAX_MOTION_FRAMES), [motion]);
  const invalidateMotion = async () => {
    await Promise.all([utils.admin.motion.list.invalidate(), utils.brand.motion.invalidate()]);
  };
  const remove = trpc.admin.motion.remove.useMutation({ onSuccess: async () => { await invalidateMotion(); toast.success("Cut to Move frame removed."); }, onError: error => toast.error(error.message) });
  const reorder = trpc.admin.motion.reorder.useMutation({ onSuccess: async () => { await invalidateMotion(); toast.success("Cut to Move frame order updated."); }, onError: error => toast.error(error.message) });

  async function submit() {
    if (!file) { toast.error("Choose a Cut to Move image first."); return; }
    if (frames.length >= MAX_MOTION_FRAMES) { toast.error("Cut to Move already has six motion frames. Remove one before adding another."); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error("Use a JPG, PNG, or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Choose an image smaller than 8 MB."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("adminToken", adminToken);
      form.append("title", title.trim() || `Cut to Move frame ${frames.length + 1}`);
      form.append("altText", altText.trim() || `Libaas Cut to Move motion frame ${frames.length + 1}`);
      form.append("sortOrder", String(frames.length));
      form.append("file", file);
      const response = await fetch("/api/admin/motion-media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({ message: "The motion image server returned an unexpected response." }));
      if (!response.ok) throw new Error(result.message || "Cut to Move image could not be saved locally.");
      await invalidateMotion();
      setFile(null); setTitle(""); setAltText("");
      toast.success(`Saved Cut to Move frame ${frames.length + 1} of ${MAX_MOTION_FRAMES}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cut to Move image could not be saved locally."); }
    finally { setUploading(false); }
  }

  function move(index: number, direction: -1 | 1) {
    const ids = frames.map(frame => frame.id); const target = index + direction;
    if (target < 0 || target >= ids.length || reorder.isPending) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate({ adminToken, ids });
  }

  const studioMain = useStudioPanelRoot();
  if (!studioMain) return null;
  return createPortal(
    <section className="mt-10 border border-[#e1c27a]/30 bg-[#181818] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Cut to Move media</p><h2 className="mt-2 font-display text-4xl">Motion gallery frames</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Manage the moving visual in the Cut to Move section separately from all suit galleries. Upload up to six motion frames and arrange the exact order visitors see while they scroll.</p></div><Move3D className="h-6 w-6 text-[#e1c27a]" /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><div className="border border-white/10 p-5"><div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">Motion frames</p><span className="border border-[#e1c27a]/35 px-2 py-1 font-mono text-[9px] tracking-[.12em] text-[#e1c27a] uppercase">{frames.length} / {MAX_MOTION_FRAMES}</span></div>{isLoading ? <Loader2 className="mt-5 h-4 w-4 animate-spin text-[#e1c27a]" /> : frames.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{frames.map((frame, index) => <article key={frame.id} className="border border-white/10 p-2"><img src={frame.imageUrl} alt={frame.altText ?? frame.title} className="aspect-[4/5] w-full object-cover" /><p className="mt-2 truncate text-sm">{frame.title}</p><p className="mt-1 font-mono text-[9px] tracking-[.12em] text-[#e1c27a] uppercase">Frame {index + 1} / {MAX_MOTION_FRAMES}</p><div className="mt-3 flex gap-3"><button type="button" aria-label={`Move ${frame.title} earlier`} disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)} className="text-white/65 hover:text-white disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Move ${frame.title} later`} disabled={index === frames.length - 1 || reorder.isPending} onClick={() => move(index, 1)} className="text-white/65 hover:text-white disabled:opacity-30"><ArrowRight className="h-3.5 w-3.5" /></button><button type="button" onClick={() => remove.mutate({ adminToken, id: frame.id })} className="inline-flex items-center gap-1 text-xs text-red-200 hover:text-red-100"><Trash2 className="h-3 w-3" />Remove</button></div></article>)}</div> : <p className="mt-5 text-sm leading-6 text-white/45">No Studio motion frames yet. The current editorial image remains visible until you upload the first frame.</p>}</div>
        <div className="border border-white/10 p-5"><p className="font-mono text-[9px] tracking-[.14em] text-[#e1c27a] uppercase">Add a movement image</p><div className="mt-5 grid gap-4"><div><Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">Frame title</Label><Input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Drape in motion" /></div><div><Label className="font-mono text-[9px] tracking-[.12em] text-white/55 uppercase">Accessibility description</Label><Input value={altText} onChange={event => setAltText(event.target.value)} className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" placeholder="Three-piece suit turning in soft light" /></div><div className={`min-h-36 border border-dashed px-4 py-5 text-center ${frames.length < MAX_MOTION_FRAMES && !uploading ? "border-white/25 hover:border-[#e1c27a]" : "pointer-events-none border-white/10 opacity-45"}`}><Upload className="mx-auto h-5 w-5 text-[#e1c27a]" /><Label htmlFor="motion-frame-file" className="mt-2 block font-mono text-[10px] tracking-[.13em] text-white uppercase">{file ? file.name : frames.length >= MAX_MOTION_FRAMES ? "Six motion frames saved" : "Choose a motion image"}</Label><span className="mt-1 block text-xs text-white/45">JPG, PNG, or WebP · maximum 8 MB</span><input id="motion-frame-file" type="file" accept="image/jpeg,image/png,image/webp" className="mx-auto mt-4 block max-w-full text-xs text-white file:mr-3 file:border-0 file:bg-[#e1c27a] file:px-3 file:py-2 file:font-mono file:text-[9px] file:tracking-[.1em] file:text-[#171417]" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} /></div><Button type="button" onClick={submit} disabled={!file || uploading || frames.length >= MAX_MOTION_FRAMES} className="w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{frames.length >= MAX_MOTION_FRAMES ? "Six frames saved" : "Save motion frame"}</Button></div></div></div>
    </section>, studioMain,
  );
}
