import { randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import type { InsertUser, User } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createOrderNumber, getInitialPaymentStatus } from "./orderUtils";

type Timestamped = { createdAt: string; updatedAt?: string };
type LocalUser = Omit<User, "createdAt" | "updatedAt" | "lastSignedIn"> & Timestamped & { lastSignedIn: string };
type StoreCategory = { id: number; title: string; slug: string; description: string | null; heroImageUrl: string | null; cloudinaryPublicId: string | null; createdAt: string; updatedAt: string };
type CategoryImage = { id: number; categoryId: number; title: string; imageUrl: string; cloudinaryPublicId: string; altText: string | null; createdAt: string };
type SaleOverride = { id: number; productHandle: string; regularPrice: string; salePrice: string | null; discountPercent: number | null; enabled: number; createdAt: string; updatedAt: string };
type ProductMedia = { id: number; productHandle: string; title: string; imageUrl: string; storageKey: string; viewLabel: string; sortOrder: number; altText: string | null; createdAt: string };
type StudioSuit = { id: number; title: string; handle: string; createdAt: string };
type PublishedStudioSuit = { id: number; productHandle: string; title: string; description: string; productType: string; sizes: { label: string; available: boolean; subSizes?: { label: string; available: boolean }[] }[]; regularPrice: string; salePrice: string | null; publishedAt: string; updatedAt: string };
type SuitFilterMeta = { id: number; productHandle: string; color: string; style: string; season: string; category: string; hideFromAll: boolean; updatedAt: string };
type MotionMedia = { id: number; title: string; imageUrl: string; storageKey: string; altText: string | null; sortOrder: number; createdAt: string };
type HiddenProduct = { id: number; productHandle: string; hiddenAt: string };
type LocalOrderItem = { id: number; orderId: number; productHandle: string; productTitle: string; productImageUrl: string | null; variantTitle: string | null; regularPrice: string | null; salePrice: string | null; unitPrice: string; quantity: number; lineTotal: string };
type LocalOrder = { id: number; orderNumber: string; customerName: string; email: string; phone: string; addressLine1: string; addressLine2: string | null; city: string; postalCode: string | null; paymentMethod: "cod"; paymentStatus: "cash_due"; bankTransferReference: null; fulfillmentStatus: "placed" | "processing" | "fulfilled" | "cancelled"; currencyCode: string; subtotal: string; deliveryFee: string; total: string; createdAt: string; updatedAt: string; items: LocalOrderItem[] };
type Review = { id: number; orderNumber: string; productHandle: string; customerName: string; rating: number; body: string; status: "pending" | "published" | "rejected"; createdAt: string; updatedAt: string };
type DeliverySettings = { freeDelivery: boolean; deliveryFee: string; updatedAt: string };
type LocalState = { version: 1; sequences: Record<string, number>; users: LocalUser[]; categories: StoreCategory[]; categoryImages: CategoryImage[]; saleOverrides: SaleOverride[]; hiddenProducts: HiddenProduct[]; studioSuits: StudioSuit[]; publishedStudioSuits: PublishedStudioSuit[]; suitFilterMeta: SuitFilterMeta[]; productMedia: ProductMedia[]; motionMedia: MotionMedia[]; orders: LocalOrder[]; reviews: Review[]; delivery: DeliverySettings };

const dataDirectory = () => process.env.LIBASS_DATA_DIR || path.join(process.cwd(), "data");
const dataFile = () => path.join(dataDirectory(), "libass-store.json");
const uploadDirectory = () => path.join(dataDirectory(), "uploads");
export const MAX_PRODUCT_MEDIA = 6;
let statePromise: Promise<LocalState> | undefined;
let writeChain = Promise.resolve();

function initialState(): LocalState {
  const now = new Date().toISOString();
  return { version: 1, sequences: { user: 1, category: 1, categoryImage: 1, sale: 1, hidden: 1, suit: 1, publishedSuit: 1, suitFilter: 1, media: 1, motion: 1, order: 1, orderItem: 1, review: 1 }, users: [], categories: [], categoryImages: [], saleOverrides: [], hiddenProducts: [], studioSuits: [], publishedStudioSuits: [], suitFilterMeta: [], productMedia: [], motionMedia: [], orders: [], reviews: [], delivery: { freeDelivery: false, deliveryFee: "0.00", updatedAt: now } };
}

async function loadState(): Promise<LocalState> {
  if (!statePromise) {
    statePromise = (async () => {
      try {
        const raw = await readFile(dataFile(), "utf8");
        return { ...initialState(), ...JSON.parse(raw) } as LocalState;
      } catch (error: any) {
        if (error?.code !== "ENOENT") console.warn("[Libass local store] Could not read state, creating a new store.", error);
        const fresh = initialState();
        await persist(fresh);
        return fresh;
      }
    })();
  }
  return statePromise;
}

async function persist(state: LocalState) {
  await mkdir(dataDirectory(), { recursive: true });
  const temp = `${dataFile()}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await rename(temp, dataFile());
}

async function mutate<T>(operation: (state: LocalState) => T | Promise<T>): Promise<T> {
  const state = await loadState();
  const result = await operation(state);
  writeChain = writeChain.then(() => persist(state));
  await writeChain;
  return result;
}

function nextId(state: LocalState, key: string) { const current = state.sequences[key] ?? 1; state.sequences[key] = current + 1; return current; }
function asDate(value: string) { return new Date(value); }
function hydrateUser(user: LocalUser): User { return { ...user, createdAt: asDate(user.createdAt), updatedAt: asDate(user.updatedAt ?? user.createdAt), lastSignedIn: asDate(user.lastSignedIn) } as User; }
function hydrateOrder(order: LocalOrder) { return { ...order, createdAt: asDate(order.createdAt), updatedAt: asDate(order.updatedAt) }; }
function safeMoney(amount: string) { const number = Number(amount); if (!Number.isFinite(number) || number < 0) throw new Error("A non-negative delivery amount is required."); return number.toFixed(2); }

export async function upsertUser(user: InsertUser): Promise<void> {
  await mutate(state => {
    const now = new Date().toISOString();
    const existing = state.users.find(entry => entry.openId === user.openId);
    const next: LocalUser = {
      id: existing?.id ?? nextId(state, "user"), openId: user.openId, name: user.name ?? existing?.name ?? null, email: user.email ?? existing?.email ?? null,
      loginMethod: user.loginMethod ?? existing?.loginMethod ?? null, role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : existing?.role ?? "user"),
      createdAt: existing?.createdAt ?? now, updatedAt: now, lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
    };
    if (existing) Object.assign(existing, next); else state.users.push(next);
  });
}

export async function getUserByOpenId(openId: string) { const state = await loadState(); const user = state.users.find(entry => entry.openId === openId); return user ? hydrateUser(user) : undefined; }

export async function listStoreCategories() { const state = await loadState(); return [...state.categories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => ({ ...item, createdAt: asDate(item.createdAt), updatedAt: asDate(item.updatedAt) })); }
export async function createStoreCategory(input: { title: string; slug: string; description?: string }) { return mutate(state => { if (state.categories.some(item => item.slug === input.slug)) throw new Error("That category slug already exists."); const now = new Date().toISOString(); const created: StoreCategory = { id: nextId(state, "category"), title: input.title, slug: input.slug, description: input.description ?? null, heroImageUrl: null, cloudinaryPublicId: null, createdAt: now, updatedAt: now }; state.categories.push(created); return { ...created, createdAt: asDate(now), updatedAt: asDate(now) }; }); }
export async function updateStoreCategoryHeroImage(input: { categoryId: number; imageUrl: string; cloudinaryPublicId: string }) { await mutate(state => { const category = state.categories.find(item => item.id === input.categoryId); if (!category) throw new Error("Category not found."); category.heroImageUrl = input.imageUrl; category.cloudinaryPublicId = input.cloudinaryPublicId; category.updatedAt = new Date().toISOString(); }); }
export async function addCategoryImage(input: { categoryId: number; title: string; imageUrl: string; cloudinaryPublicId: string; altText?: string }) { return mutate(state => { const created: CategoryImage = { id: nextId(state, "categoryImage"), categoryId: input.categoryId, title: input.title, imageUrl: input.imageUrl, cloudinaryPublicId: input.cloudinaryPublicId, altText: input.altText ?? null, createdAt: new Date().toISOString() }; state.categoryImages.push(created); return { ...created, createdAt: asDate(created.createdAt) }; }); }
export async function listCategoryImages(categoryId: number) { const state = await loadState(); return state.categoryImages.filter(item => item.categoryId === categoryId).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }
export async function listAllCategoryImages() { const state = await loadState(); return [...state.categoryImages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }
export async function getCategoryImageById(id: number) { const state = await loadState(); const image = state.categoryImages.find(item => item.id === id); return image ? { ...image, createdAt: asDate(image.createdAt) } : null; }
export async function deleteCategoryImage(id: number) { return mutate(state => { const image = state.categoryImages.find(item => item.id === id); if (!image) throw new Error("Managed image not found."); state.categoryImages = state.categoryImages.filter(item => item.id !== id); const category = state.categories.find(item => item.id === image.categoryId); if (category?.heroImageUrl === image.imageUrl) { category.heroImageUrl = null; category.cloudinaryPublicId = null; category.updatedAt = new Date().toISOString(); } return image; }); }

export async function listSaleOverrides() { const state = await loadState(); return [...state.saleOverrides].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => ({ ...item, createdAt: asDate(item.createdAt), updatedAt: asDate(item.updatedAt) })); }
export async function getSaleOverridesByHandles(handles: string[]) { const rows = await listSaleOverrides(); const wanted = new Set(handles); return new Map(rows.filter(row => wanted.has(row.productHandle)).map(row => [row.productHandle, row])); }
export async function upsertSaleOverride(input: { productHandle: string; regularPrice: string; salePrice?: string | null; discountPercent?: number | null; enabled: boolean }) { return mutate(state => { const now = new Date().toISOString(); const existing = state.saleOverrides.find(item => item.productHandle === input.productHandle); const row: SaleOverride = { id: existing?.id ?? nextId(state, "sale"), productHandle: input.productHandle, regularPrice: safeMoney(input.regularPrice), salePrice: input.salePrice ? safeMoney(input.salePrice) : null, discountPercent: input.discountPercent ?? null, enabled: input.enabled ? 1 : 0, createdAt: existing?.createdAt ?? now, updatedAt: now }; if (existing) Object.assign(existing, row); else state.saleOverrides.push(row); return { ...row, createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt) }; }); }

export async function listHiddenProductHandles() { const state = await loadState(); return new Set(state.hiddenProducts.map(item => item.productHandle)); }
export async function hideStoreProduct(productHandle: string) { await mutate(state => { const existing = state.hiddenProducts.find(item => item.productHandle === productHandle); if (existing) existing.hiddenAt = new Date().toISOString(); else state.hiddenProducts.push({ id: nextId(state, "hidden"), productHandle, hiddenAt: new Date().toISOString() }); }); }
export async function listStudioSuits() { const state = await loadState(); return state.studioSuits.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }
export async function createStudioSuit(input: { title: string; handle: string }) { return mutate(state => { const title = input.title.trim(); const handle = input.handle.trim(); if (!title || !handle) throw new Error("A suit name and handle are required."); if (state.studioSuits.some(item => item.handle === handle)) throw new Error("A Studio suit already uses that handle."); const created: StudioSuit = { id: nextId(state, "suit"), title, handle, createdAt: new Date().toISOString() }; state.studioSuits.push(created); return { ...created, createdAt: asDate(created.createdAt) }; }); }
export async function listPublishedStudioSuits() { const state = await loadState(); return (state.publishedStudioSuits ?? []).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(item => ({ ...item, publishedAt: asDate(item.publishedAt), updatedAt: asDate(item.updatedAt) })); }
export async function publishStudioSuit(input: { productHandle: string; title: string; description: string; productType: string; sizes?: { label: string; available: boolean; subSizes?: { label: string; available: boolean }[] }[]; regularPrice: string; salePrice?: string | null }) { return mutate(state => { state.publishedStudioSuits ??= []; const productHandle = input.productHandle.trim(); const title = input.title.trim(); const description = input.description.trim(); const productType = (input.productType || "").trim() || "Unstitched"; const sizes = (input.sizes ?? []).map(s => ({ label: s.label.trim(), available: Boolean(s.available), subSizes: (s.subSizes ?? []).map(sub => ({ label: sub.label.trim(), available: Boolean(sub.available) })).filter(sub => sub.label.length > 0).slice(0, 20) })).filter(s => s.label.length > 0).slice(0, 20); const regularPrice = safeMoney(input.regularPrice); const salePrice = input.salePrice?.trim() ? safeMoney(input.salePrice) : null; if (!state.studioSuits.some(item => item.handle === productHandle)) throw new Error("Create the Studio suit before publishing it."); if (!title || !description) throw new Error("A suit title and description are required before publishing."); if (salePrice && (Number(salePrice) <= 0 || Number(salePrice) >= Number(regularPrice))) throw new Error("Sale price must be greater than zero and lower than the regular price."); const now = new Date().toISOString(); const existing = state.publishedStudioSuits.find(item => item.productHandle === productHandle); const next: PublishedStudioSuit = { id: existing?.id ?? nextId(state, "publishedSuit"), productHandle, title, description, productType, sizes, regularPrice, salePrice, publishedAt: existing?.publishedAt ?? now, updatedAt: now }; if (existing) Object.assign(existing, next); else state.publishedStudioSuits.push(next); return { ...next, publishedAt: asDate(next.publishedAt), updatedAt: asDate(next.updatedAt) }; }); }
export async function listSuitFilterMeta() { const state = await loadState(); return (state.suitFilterMeta ?? []).slice().sort((a, b) => a.productHandle.localeCompare(b.productHandle)).map(item => ({ ...item, updatedAt: asDate(item.updatedAt) })); }
export async function upsertSuitFilterMeta(input: { productHandle: string; color: string; style: string; season: string; category?: string; hideFromAll?: boolean }) { return mutate(state => { state.suitFilterMeta ??= []; const productHandle = input.productHandle.trim(); const color = input.color.trim(); const style = input.style.trim(); const season = input.season.trim(); const category = (input.category ?? "").trim(); const hideFromAll = Boolean(input.hideFromAll) && category.length > 0; if (!productHandle || !color || !style || !season) throw new Error("Color, style, and season are all required for storefront filters."); const now = new Date().toISOString(); const existing = state.suitFilterMeta.find(item => item.productHandle === productHandle); const next: SuitFilterMeta = { id: existing?.id ?? nextId(state, "suitFilter"), productHandle, color, style, season, category, hideFromAll, updatedAt: now }; if (existing) Object.assign(existing, next); else state.suitFilterMeta.push(next); return { ...next, updatedAt: asDate(next.updatedAt) }; }); }

function cleanFileName(name: string) { return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "libass-image"; }
function extensionFor(mimeType: string, fileName: string) { const supplied = path.extname(fileName).toLowerCase(); if ([".jpg", ".jpeg", ".png", ".webp"].includes(supplied)) return supplied; return mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg"; }
export async function saveLocalImageUpload(input: { fileName: string; mimeType: string; dataUrl: string }) {
  if (!/^image\/(jpeg|png|webp)$/.test(input.mimeType)) throw new Error("Use a JPG, PNG, or WebP image.");
  const encoded = input.dataUrl.split(",")[1]; if (!encoded) throw new Error("The selected image could not be read.");
  const buffer = Buffer.from(encoded, "base64"); if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error("Images must be smaller than 8 MB.");
  await mkdir(uploadDirectory(), { recursive: true });
  const storageKey = `${Date.now()}-${randomUUID().slice(0, 8)}-${cleanFileName(path.basename(input.fileName, path.extname(input.fileName)))}${extensionFor(input.mimeType, input.fileName)}`;
  await writeFile(path.join(uploadDirectory(), storageKey), buffer);
  return { storageKey, url: `/uploads/${storageKey}` };
}
export async function addProductMedia(input: { productHandle: string; title: string; imageUrl: string; storageKey: string; viewLabel: string; sortOrder: number; altText?: string }) { return mutate(state => { const productHandle = input.productHandle.trim(); if (!productHandle) throw new Error("Choose a product before saving a garment view."); const existing = state.productMedia.filter(item => item.productHandle === productHandle); if (existing.length >= MAX_PRODUCT_MEDIA) throw new Error(`Each suit can have up to ${MAX_PRODUCT_MEDIA} gallery images. Remove a view before adding another.`); const created: ProductMedia = { id: nextId(state, "media"), productHandle, title: input.title, imageUrl: input.imageUrl, storageKey: input.storageKey, viewLabel: input.viewLabel, sortOrder: Math.min(Math.max(input.sortOrder, 0), MAX_PRODUCT_MEDIA - 1), altText: input.altText ?? null, createdAt: new Date().toISOString() }; state.productMedia.push(created); return { ...created, createdAt: asDate(created.createdAt) }; }); }
export async function listProductMedia(productHandle: string) { const state = await loadState(); return state.productMedia.filter(item => item.productHandle === productHandle).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }
export async function deleteProductMedia(id: number) { const removed = await mutate(state => { const image = state.productMedia.find(item => item.id === id); if (!image) throw new Error("Garment view not found."); state.productMedia = state.productMedia.filter(item => item.id !== id); return image; }); if (removed.storageKey) await unlink(path.join(uploadDirectory(), path.basename(removed.storageKey))).catch(() => undefined); return removed; }
export async function deleteProductMediaForProduct(productHandle: string) { const removed = await mutate(state => { const gallery = state.productMedia.filter(item => item.productHandle === productHandle); state.productMedia = state.productMedia.filter(item => item.productHandle !== productHandle); return gallery; }); await Promise.all(removed.map(item => item.storageKey ? unlink(path.join(uploadDirectory(), path.basename(item.storageKey))).catch(() => undefined) : undefined)); return removed; }
export async function reorderProductMedia(input: { productHandle: string; ids: number[] }) { return mutate(state => { const ids = input.ids; if (!ids.length || ids.length > MAX_PRODUCT_MEDIA || new Set(ids).size !== ids.length) throw new Error("Choose a valid product gallery order."); const gallery = state.productMedia.filter(item => item.productHandle === input.productHandle); if (gallery.length !== ids.length || ids.some(id => !gallery.some(item => item.id === id))) throw new Error("Gallery images can only be ordered within their own product."); const required = ["front", "back", "detail"]; const core = required.map(label => gallery.find(item => item.viewLabel === label)).filter((item): item is ProductMedia => Boolean(item)); if (core.length === required.length && core.some((item, index) => ids[index] !== item.id)) throw new Error("Front, back, and detail stay locked as the first three suit views."); ids.forEach((id, index) => { const image = state.productMedia.find(item => item.id === id); if (image) image.sortOrder = index; }); return ids.map(id => state.productMedia.find(item => item.id === id)!).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }); }

export async function listMotionMedia() { const state = await loadState(); return state.motionMedia.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }
export async function addMotionMedia(input: { title: string; imageUrl: string; storageKey: string; sortOrder: number; altText?: string }) { return mutate(state => { if (state.motionMedia.length >= MAX_PRODUCT_MEDIA) throw new Error(`Cut to Move can have up to ${MAX_PRODUCT_MEDIA} motion images. Remove a frame before adding another.`); const created: MotionMedia = { id: nextId(state, "motion"), title: input.title, imageUrl: input.imageUrl, storageKey: input.storageKey, altText: input.altText ?? null, sortOrder: Math.min(Math.max(input.sortOrder, 0), MAX_PRODUCT_MEDIA - 1), createdAt: new Date().toISOString() }; state.motionMedia.push(created); return { ...created, createdAt: asDate(created.createdAt) }; }); }
export async function deleteMotionMedia(id: number) { const removed = await mutate(state => { const image = state.motionMedia.find(item => item.id === id); if (!image) throw new Error("Cut to Move image not found."); state.motionMedia = state.motionMedia.filter(item => item.id !== id); return image; }); if (removed.storageKey) await unlink(path.join(uploadDirectory(), path.basename(removed.storageKey))).catch(() => undefined); return removed; }
export async function reorderMotionMedia(ids: number[]) { return mutate(state => { if (!ids.length || ids.length > MAX_PRODUCT_MEDIA || new Set(ids).size !== ids.length || state.motionMedia.length !== ids.length || ids.some(id => !state.motionMedia.some(item => item.id === id))) throw new Error("Choose a valid Cut to Move image order."); ids.forEach((id, index) => { const image = state.motionMedia.find(item => item.id === id); if (image) image.sortOrder = index; }); return ids.map(id => state.motionMedia.find(item => item.id === id)!).map(item => ({ ...item, createdAt: asDate(item.createdAt) })); }); }

export async function getDeliverySettings() { const state = await loadState(); return { ...state.delivery, updatedAt: asDate(state.delivery.updatedAt) }; }
export async function updateDeliverySettings(input: { freeDelivery: boolean; deliveryFee: string }) { return mutate(state => { state.delivery = { freeDelivery: input.freeDelivery, deliveryFee: safeMoney(input.deliveryFee), updatedAt: new Date().toISOString() }; return { ...state.delivery, updatedAt: asDate(state.delivery.updatedAt) }; }); }

export type CreateStoreOrderInput = { customerName: string; email: string; phone: string; addressLine1: string; addressLine2?: string; city: string; postalCode?: string; paymentMethod: "cod"; currencyCode: string; subtotal: string; deliveryFee?: string; total: string; items: Array<{ productHandle: string; productTitle: string; productImageUrl?: string | null; variantTitle?: string; regularPrice?: string | null; salePrice?: string | null; unitPrice: string; quantity: number; lineTotal: string; }>; };
export async function createStoreOrder(input: CreateStoreOrderInput) { return mutate(state => { const now = new Date().toISOString(); const id = nextId(state, "order"); const order: LocalOrder = { id, orderNumber: createOrderNumber(Date.now(), randomUUID().slice(0, 8)), customerName: input.customerName, email: input.email, phone: input.phone, addressLine1: input.addressLine1, addressLine2: input.addressLine2 ?? null, city: input.city, postalCode: input.postalCode ?? null, paymentMethod: input.paymentMethod, paymentStatus: getInitialPaymentStatus(input.paymentMethod) as "cash_due", bankTransferReference: null, fulfillmentStatus: "placed", currencyCode: input.currencyCode, subtotal: safeMoney(input.subtotal), deliveryFee: safeMoney(input.deliveryFee ?? "0"), total: safeMoney(input.total), createdAt: now, updatedAt: now, items: input.items.map(item => ({ id: nextId(state, "orderItem"), orderId: id, productHandle: item.productHandle, productTitle: item.productTitle, productImageUrl: item.productImageUrl ?? null, variantTitle: item.variantTitle ?? null, regularPrice: item.regularPrice ?? null, salePrice: item.salePrice ?? null, unitPrice: safeMoney(item.unitPrice), quantity: item.quantity, lineTotal: safeMoney(item.lineTotal) })) }; state.orders.push(order); return hydrateOrder(order); }); }
export async function getStoreOrderByNumber(orderNumber: string) { const state = await loadState(); const order = state.orders.find(item => item.orderNumber === orderNumber); return order ? hydrateOrder(order) : null; }
export async function listStoreOrders(limit = 1000, offset = 0) { const state = await loadState(); return state.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(offset, offset + Math.min(Math.max(limit, 1), 1000)).map(hydrateOrder); }
export async function listStoreOrdersPage(input: { limit?: number; offset?: number } = {}) { const state = await loadState(); const rows = state.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const offset = Math.max(0, input.offset ?? 0); const limit = Math.min(Math.max(input.limit ?? 50, 1), 100); const items = rows.slice(offset, offset + limit).map(hydrateOrder); return { items, total: rows.length, nextOffset: offset + items.length < rows.length ? offset + items.length : null }; }
export async function updateStoreOrderFulfillmentStatus(input: { orderNumber: string; fulfillmentStatus: "placed" | "processing" | "fulfilled" | "cancelled" }) { return mutate(state => { const order = state.orders.find(item => item.orderNumber === input.orderNumber); if (!order) throw new Error("Order not found."); order.fulfillmentStatus = input.fulfillmentStatus; order.updatedAt = new Date().toISOString(); return hydrateOrder(order); }); }

export async function listReviews(productHandle: string, includeUnpublished = false) { const state = await loadState(); return state.reviews.filter(item => item.productHandle === productHandle && (includeUnpublished || item.status === "published")).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => ({ ...item, createdAt: asDate(item.createdAt), updatedAt: asDate(item.updatedAt) })); }
export async function createReview(input: { orderNumber: string; productHandle: string; customerName: string; rating: number; body: string }) { return mutate(state => { const now = new Date().toISOString(); const created: Review = { id: nextId(state, "review"), orderNumber: input.orderNumber, productHandle: input.productHandle, customerName: input.customerName, rating: input.rating, body: input.body.trim(), status: "pending", createdAt: now, updatedAt: now }; state.reviews.push(created); return { ...created, createdAt: asDate(now), updatedAt: asDate(now) }; }); }
export async function listAllReviews(limit = 1000) { const state = await loadState(); return state.reviews.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(item => ({ ...item, createdAt: asDate(item.createdAt), updatedAt: asDate(item.updatedAt) })); }
export async function updateReviewStatus(id: number, status: "pending" | "published" | "rejected") { return mutate(state => { const review = state.reviews.find(item => item.id === id); if (!review) throw new Error("Review not found."); review.status = status; review.updatedAt = new Date().toISOString(); return { ...review, createdAt: asDate(review.createdAt), updatedAt: asDate(review.updatedAt) }; }); }
