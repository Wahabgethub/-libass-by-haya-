import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCart } from "../_core/shopify";
import { createStoreOrder, getDeliverySettings, getSaleOverridesByHandles, getStoreOrderByNumber } from "../db";
import { resolveEffectivePrice } from "../salePricing";
import { publicProcedure, router } from "../_core/trpc";
const customerSchema = z.object({ customerName: z.string().min(2).max(160), email: z.string().email().max(320), phone: z.string().min(7).max(40), addressLine1: z.string().min(5).max(255), addressLine2: z.string().max(255).optional(), city: z.string().min(2).max(120), postalCode: z.string().max(24).optional() });
export const ordersRouter = router({
  create: publicProcedure.input(customerSchema.extend({ cartId: z.string().min(1), paymentMethod: z.literal("cod") })).mutation(async ({ input }) => {
    const cart = await getCart(input.cartId); if (!cart || !cart.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Your bag is empty or unavailable." });
    const overrides = await getSaleOverridesByHandles(cart.items.map(item => item.productHandle));
    const items = cart.items.map(item => { const price = resolveEffectivePrice(item.unitPrice.amount, overrides.get(item.productHandle)); const lineTotal = (Number(price.effectivePrice) * item.quantity).toFixed(2); return { productHandle: item.productHandle, productTitle: item.productTitle, productImageUrl: item.image?.url, variantTitle: item.variantTitle, regularPrice: price.regularPrice, salePrice: price.salePrice, unitPrice: price.effectivePrice, quantity: item.quantity, lineTotal }; });
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0).toFixed(2);
    const delivery = await getDeliverySettings();
    const deliveryFee = delivery.freeDelivery ? "0.00" : delivery.deliveryFee;
    const total = (Number(subtotal) + Number(deliveryFee)).toFixed(2);
    return createStoreOrder({ ...input, currencyCode: cart.total.currencyCode, subtotal, deliveryFee, total, items });
  }),
  receipt: publicProcedure.input(z.object({ orderNumber: z.string().min(8).max(32), email: z.string().email().max(320) })).query(async ({ input }) => { const receipt = await getStoreOrderByNumber(input.orderNumber); if (!receipt || receipt.email.toLowerCase() !== input.email.toLowerCase()) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found." }); return receipt; }),
});
