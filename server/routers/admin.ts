import { z } from "zod";
import { assertValidAdminAccessToken, issueAdminAccessToken } from "../adminAuth";
import { deleteCloudinaryImage, getCloudinaryUploadSignature } from "../cloudinary";
import { addCategoryImage, addProductMedia, createStoreCategory, createStudioSuit, deleteCategoryImage, deleteMotionMedia, deleteProductMedia, deleteProductMediaForProduct, getCategoryImageById, getDeliverySettings, getStoreOrderByNumber, hideStoreProduct, listAllCategoryImages, listAllReviews, listCategoryImages, listMotionMedia, listProductMedia, listPublishedStudioSuits, listSaleOverrides, listStoreCategories, listStoreOrders, listStoreOrdersPage, listStudioSuits, listSuitFilterMeta, publishStudioSuit, reorderMotionMedia, reorderProductMedia, saveLocalImageUpload, updateDeliverySettings, updateReviewStatus, updateStoreCategoryHeroImage, updateStoreOrderFulfillmentStatus, upsertSaleOverride, upsertSuitFilterMeta } from "../db";
import { publicProcedure, router } from "../_core/trpc";
const adminToken = z.string().min(32); const adminOnly = (token: string) => assertValidAdminAccessToken(token);
export const adminRouter = router({
  unlock: publicProcedure.input(z.object({ password: z.string().min(1) })).mutation(({ input }) => ({ token: issueAdminAccessToken(input.password), expiresInMinutes: 480 })),
  category: router({
    list: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listStoreCategories(); }),
    create: publicProcedure.input(z.object({ adminToken, title: z.string().min(2).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().max(1000).optional() })).mutation(({ input }) => { adminOnly(input.adminToken); return createStoreCategory(input); }),
    images: publicProcedure.input(z.object({ adminToken, categoryId: z.number().int().positive() })).query(({ input }) => { adminOnly(input.adminToken); return listCategoryImages(input.categoryId); }),
    setHeroImage: publicProcedure.input(z.object({ adminToken, categoryId: z.number().int().positive(), imageUrl: z.string().url(), cloudinaryPublicId: z.string().min(1) })).mutation(({ input }) => { adminOnly(input.adminToken); return updateStoreCategoryHeroImage(input); }),
  }),
  sales: router({
    list: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listSaleOverrides(); }),
    upsert: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), regularPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/), salePrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(), discountPercent: z.number().int().min(1).max(99).optional(), enabled: z.boolean() })).mutation(({ input }) => { adminOnly(input.adminToken); const regular = Number(input.regularPrice); const fromPercent = input.discountPercent ? (regular * (1 - input.discountPercent / 100)).toFixed(2) : undefined; const sale = input.salePrice ?? fromPercent; if (input.enabled && (!sale || Number(sale) >= regular)) throw new Error("Sale price must be lower than the regular price"); return upsertSaleOverride({ ...input, salePrice: sale, discountPercent: input.discountPercent ?? null }); }),
  }),
  delivery: router({
    get: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return getDeliverySettings(); }),
    update: publicProcedure.input(z.object({ adminToken, freeDelivery: z.boolean(), deliveryFee: z.string().regex(/^\d+(?:\.\d{1,2})?$/) })).mutation(({ input }) => { adminOnly(input.adminToken); return updateDeliverySettings(input); }),
  }),
  reviews: router({
    list: publicProcedure.input(z.object({ adminToken, limit: z.number().int().min(1).max(1000).optional() })).query(({ input }) => { adminOnly(input.adminToken); return listAllReviews(input.limit); }),
    updateStatus: publicProcedure.input(z.object({ adminToken, id: z.number().int().positive(), status: z.enum(["pending", "published", "rejected"]) })).mutation(({ input }) => { adminOnly(input.adminToken); return updateReviewStatus(input.id, input.status); }),
  }),
  products: router({
    remove: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180) })).mutation(({ input }) => { adminOnly(input.adminToken); return hideStoreProduct(input.productHandle); }),
    removeWithManagedMedia: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), confirmation: z.literal("DELETE_PRODUCT_AND_MEDIA") })).mutation(async ({ input }) => { adminOnly(input.adminToken); const removedMedia = await deleteProductMediaForProduct(input.productHandle); await hideStoreProduct(input.productHandle); return { removedMedia: removedMedia.length }; }),
  }),
  suits: router({
    list: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listStudioSuits(); }),
    create: publicProcedure.input(z.object({ adminToken, title: z.string().min(2).max(160), handle: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180) })).mutation(({ input }) => { adminOnly(input.adminToken); return createStudioSuit(input); }),
    published: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listPublishedStudioSuits(); }),
    publish: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), title: z.string().min(2).max(160), description: z.string().min(10).max(2000), productType: z.string().min(1).max(60), sizes: z.array(z.object({ label: z.string().min(1).max(24), available: z.boolean(), subSizes: z.array(z.object({ label: z.string().min(1).max(24), available: z.boolean() })).max(20).optional() })).max(20).optional(), regularPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/), salePrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional() })).mutation(async ({ input }) => { adminOnly(input.adminToken); if ((await listProductMedia(input.productHandle)).length < 2) throw new Error("Add at least 2 images (Front + one more) before publishing this suit."); return publishStudioSuit(input); }),
  }),
  suitFilters: router({
    list: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listSuitFilterMeta(); }),
    save: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), color: z.string().min(1).max(60), style: z.string().min(1).max(60), season: z.string().min(1).max(60), category: z.string().max(80).optional(), hideFromAll: z.boolean().optional() })).mutation(({ input }) => { adminOnly(input.adminToken); return upsertSuitFilterMeta(input); }),
  }),
  media: router({
    list: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180) })).query(({ input }) => { adminOnly(input.adminToken); return listProductMedia(input.productHandle); }),
    upload: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), title: z.string().min(1).max(160), viewLabel: z.enum(["front", "back", "detail", "editorial", "other"]), sortOrder: z.number().int().min(0).max(5), fileName: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataUrl: z.string().startsWith("data:image/"), altText: z.string().max(255).optional() })).mutation(async ({ input }) => { adminOnly(input.adminToken); const uploaded = await saveLocalImageUpload(input); return addProductMedia({ ...input, imageUrl: uploaded.url, storageKey: uploaded.storageKey }); }),
    remove: publicProcedure.input(z.object({ adminToken, id: z.number().int().positive() })).mutation(({ input }) => { adminOnly(input.adminToken); return deleteProductMedia(input.id); }),
    reorder: publicProcedure.input(z.object({ adminToken, productHandle: z.string().min(1).max(180), ids: z.array(z.number().int().positive()).min(1).max(6) })).mutation(({ input }) => { adminOnly(input.adminToken); return reorderProductMedia(input); }),
  }),
  motion: router({
    list: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listMotionMedia(); }),
    remove: publicProcedure.input(z.object({ adminToken, id: z.number().int().positive() })).mutation(({ input }) => { adminOnly(input.adminToken); return deleteMotionMedia(input.id); }),
    reorder: publicProcedure.input(z.object({ adminToken, ids: z.array(z.number().int().positive()).min(1).max(6) })).mutation(({ input }) => { adminOnly(input.adminToken); return reorderMotionMedia(input.ids); }),
  }),
  cloudinary: router({
    status: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return { connected: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) }; }),
    assets: publicProcedure.input(z.object({ adminToken })).query(({ input }) => { adminOnly(input.adminToken); return listAllCategoryImages(); }),
    deleteAsset: publicProcedure.input(z.object({ adminToken, imageId: z.number().int().positive() })).mutation(async ({ input }) => { adminOnly(input.adminToken); const image = await getCategoryImageById(input.imageId); if (!image) throw new Error("Managed image not found."); await deleteCloudinaryImage(image.cloudinaryPublicId); return deleteCategoryImage(image.id); }),
    signature: publicProcedure.input(z.object({ adminToken, categorySlug: z.string().min(1).max(140) })).mutation(({ input }) => { adminOnly(input.adminToken); return getCloudinaryUploadSignature(`libass-by-haya/categories/${input.categorySlug}`); }),
    recordUpload: publicProcedure.input(z.object({ adminToken, categoryId: z.number().int().positive(), title: z.string().min(1).max(160), imageUrl: z.string().url(), cloudinaryPublicId: z.string().min(1), altText: z.string().max(255).optional() })).mutation(({ input }) => { adminOnly(input.adminToken); return addCategoryImage(input); }),
  }),
  orders: router({
    list: publicProcedure.input(z.object({ adminToken, limit: z.number().int().min(1).max(1000).optional() })).query(({ input }) => { adminOnly(input.adminToken); return listStoreOrders(input.limit ?? 1000); }),
    page: publicProcedure.input(z.object({ adminToken, limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() })).query(({ input }) => { adminOnly(input.adminToken); return listStoreOrdersPage(input); }),
    byNumber: publicProcedure.input(z.object({ adminToken, orderNumber: z.string().min(4).max(32) })).query(({ input }) => { adminOnly(input.adminToken); return getStoreOrderByNumber(input.orderNumber); }),
    updateFulfillment: publicProcedure.input(z.object({ adminToken, orderNumber: z.string().min(4).max(32), fulfillmentStatus: z.enum(["placed", "processing", "fulfilled", "cancelled"]) })).mutation(({ input }) => { adminOnly(input.adminToken); return updateStoreOrderFulfillmentStatus(input); }),
  }),
});
