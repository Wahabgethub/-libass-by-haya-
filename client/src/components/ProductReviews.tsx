import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function ProductReviewMount() {
  const [location] = useLocation();
  const match = location.match(/^\/products\/([^/]+)$/);
  const productHandle = match ? decodeURIComponent(match[1]) : "";
  const { data: product } = trpc.commerce.products.byHandle.useQuery({ handle: productHandle || "not-a-product" }, { enabled: Boolean(productHandle), retry: false });
  return product ? <ProductReviews productHandle={productHandle} /> : null;
}

export function ProductReviews({ productHandle }: { productHandle: string }) {
  const utils = trpc.useUtils();
  const { data: reviews = [], isLoading } = trpc.reviews.list.useQuery({ productHandle });
  const [rating, setRating] = useState("5");
  const submit = trpc.reviews.submit.useMutation({
    onSuccess: async () => { await utils.reviews.list.invalidate({ productHandle }); toast.success("Thank you. Your verified review is awaiting Studio approval."); },
    onError: error => toast.error(error.message),
  });
  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); submit.mutate({ productHandle, orderNumber: String(form.get("orderNumber") ?? ""), email: String(form.get("email") ?? ""), rating: Number(rating), body: String(form.get("body") ?? "") }); }
  return <section className="bg-[#121212] px-4 pb-20 text-white sm:px-7 lg:px-10"><div className="mx-auto max-w-6xl border-t border-white/15 pt-10"><div className="grid gap-8 lg:grid-cols-[1fr_.85fr]"><div><p className="eyebrow">Verified customer notes</p><h2 className="mt-3 font-display text-4xl">Worn, received, considered.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/55">Only customers whose Cash-on-Delivery order includes this piece can submit a note. Reviews appear here only after Studio approval.</p><div className="mt-7 space-y-4">{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#e1c27a]" /> : reviews.length ? reviews.map(review => <article key={review.id} className="border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between gap-4"><p className="text-sm font-medium">{review.customerName}</p><p className="inline-flex gap-0.5 text-[#e1c27a]" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="h-3.5 w-3.5 fill-current" />)}</p></div><p className="mt-3 text-sm leading-6 text-white/70">{review.body}</p></article>) : <div className="border border-dashed border-white/15 p-5 text-sm leading-6 text-white/50">No verified customer reviews have been published for this piece yet.</div>}</div></div><form onSubmit={onSubmit} className="h-fit border border-[#e1c27a]/30 bg-[#181818] p-6"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-[#e1c27a]" /><div><p className="font-mono text-[10px] tracking-[.14em] text-[#e1c27a] uppercase">Share a verified note</p><p className="mt-1 text-xs text-white/45">Your order details are checked before submission.</p></div></div><div className="mt-6 grid gap-4"><div><Label htmlFor="review-order" className="font-mono text-[9px] tracking-[.12em] text-white/60 uppercase">Order number</Label><Input id="review-order" name="orderNumber" required placeholder="HAYA-..." className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" /></div><div><Label htmlFor="review-email" className="font-mono text-[9px] tracking-[.12em] text-white/60 uppercase">Order email</Label><Input id="review-email" name="email" type="email" required placeholder="you@example.com" className="mt-2 h-11 rounded-none border-white/20 bg-transparent text-white" /></div><div><Label htmlFor="review-rating" className="font-mono text-[9px] tracking-[.12em] text-white/60 uppercase">Your rating</Label><select id="review-rating" value={rating} onChange={event => setRating(event.target.value)} className="mt-2 h-11 w-full border border-white/20 bg-[#181818] px-3 text-sm text-white">{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></div><div><Label htmlFor="review-body" className="font-mono text-[9px] tracking-[.12em] text-white/60 uppercase">Your review</Label><Textarea id="review-body" name="body" required minLength={20} maxLength={1200} placeholder="Tell us about the fit, fabric, and experience." className="mt-2 min-h-32 rounded-none border-white/20 bg-transparent text-white" /></div></div><Button type="submit" disabled={submit.isPending} className="mt-5 w-full rounded-none bg-[#e1c27a] font-mono text-[10px] tracking-[.13em] text-[#171417] uppercase hover:bg-white">{submit.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Submit for review</Button></form></div></div></section>;
}
