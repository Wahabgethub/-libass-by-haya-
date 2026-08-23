import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createReview, getStoreOrderByNumber, listReviews } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const reviewsRouter = router({
  list: publicProcedure.input(z.object({ productHandle: z.string().min(1).max(180) })).query(({ input }) => listReviews(input.productHandle)),
  submit: publicProcedure.input(z.object({ productHandle: z.string().min(1).max(180), orderNumber: z.string().min(8).max(32), email: z.string().email().max(320), rating: z.number().int().min(1).max(5), body: z.string().trim().min(20).max(1200) })).mutation(async ({ input }) => {
    const order = await getStoreOrderByNumber(input.orderNumber);
    if (!order || order.email.toLowerCase() !== input.email.toLowerCase()) throw new TRPCError({ code: "NOT_FOUND", message: "We could not verify this order and email." });
    if (!order.items.some(item => item.productHandle === input.productHandle)) throw new TRPCError({ code: "BAD_REQUEST", message: "This product was not included in the verified order." });
    return createReview({ orderNumber: input.orderNumber, productHandle: input.productHandle, customerName: order.customerName, rating: input.rating, body: input.body });
  }),
});
