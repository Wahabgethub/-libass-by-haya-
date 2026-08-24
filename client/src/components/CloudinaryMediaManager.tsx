import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useStudioPanelRoot } from "@/components/useStudioPanelRoot";
import { Cloud, Loader2, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function CloudinaryMediaManager({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const { data: status } = trpc.admin.cloudinary.status.useQuery({ adminToken });
  const { data: assets = [], isLoading } = trpc.admin.cloudinary.assets.useQuery({ adminToken });
  const remove = trpc.admin.cloudinary.deleteAsset.useMutation({
    onSuccess: async () => { await Promise.all([utils.admin.cloudinary.assets.invalidate(), utils.admin.category.images.invalidate(), utils.admin.category.list.invalidate()]); toast.success("Cloudinary image deleted and removed from Studio."); },
    onError: error => toast.error(error.message),
  });
  const studioMain = useStudioPanelRoot();
  if (!studioMain) return null;
  return createPortal(<section className="mt-10 border border-red-300/25 bg-[#181818] p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Cloudinary library</p><h2 className="mt-2 font-display text-4xl">Managed category images</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">These are the earlier Cloudinary-managed category assets. Removing one deletes it from Cloudinary and from Libaas Studio. Local front, back, and detail garment views are managed separately in the garment-view panel.</p></div><Cloud className="h-6 w-6 text-[#e1c27a]" /></div>{!status?.connected ? <div className="mt-6 border border-amber-300/25 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/75">Cloudinary is not connected in this local run. Local garment images still work from <code>data/uploads</code>; Cloudinary deletion becomes available when its credentials are configured.</div> : isLoading ? <Loader2 className="mt-6 h-5 w-5 animate-spin text-[#e1c27a]" /> : assets.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{assets.map(asset => <article key={asset.id} className="overflow-hidden border border-white/10"><img src={asset.imageUrl} alt={asset.altText ?? asset.title} className="aspect-[4/3] w-full object-cover" /><div className="p-4"><p className="truncate text-sm">{asset.title}</p><p className="mt-1 truncate font-mono text-[9px] tracking-[.1em] text-white/40 uppercase">{asset.cloudinaryPublicId}</p><Button type="button" variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm(`Permanently delete “${asset.title}” from Cloudinary and remove it from Libaas Studio? This cannot be undone.`)) remove.mutate({ adminToken, imageId: asset.id }); }} className="mt-4 h-9 w-full rounded-none border-red-300/30 text-[9px] tracking-[.12em] text-red-100 uppercase hover:bg-red-300/10 hover:text-red-100"><Trash2 className="h-3.5 w-3.5" />Delete Cloudinary image</Button></div></article>)}</div> : <div className="mt-6 border border-dashed border-white/15 p-5 text-sm text-white/45">No Cloudinary-managed category images are recorded in this Studio.</div>}</section>, studioMain);
}
