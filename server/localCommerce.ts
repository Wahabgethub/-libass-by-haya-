import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import type { Cart, CartItem, Product } from "@shared/commerce/types";

const PKR = (amount: string) => ({ amount, currencyCode: "PKR" });
const azureImage = "https://cdn.shopify.com/s/files/1/0997/8691/6160/files/libass-azure-garden-three-piece-front_fd62b756.png?v=1787475150";
const azureBack = "https://cdn.shopify.com/s/files/1/0997/8691/6160/files/libass-azure-garden-three-piece-back_5e8d7974.png?v=1787475150";
const sandstoneImage = "https://cdn.shopify.com/s/files/1/0997/8691/6160/files/OcHxhoSlOYHGROBn.jpg?v=1787470553";

const localProducts: Product[] = [
  { id: "local-product-azure", handle: "azure-garden-three-piece-suit", title: "Azure Garden Three-Piece Suit", description: "A coordinated three-piece suit in Azure Garden blue, composed as one complete set. Includes the front and back textile story shown in the garment gallery.", descriptionHtml: "", productType: "Three-piece suit", vendor: "Libaas by HAYA", tags: ["3 pc", "three piece", "suit"], images: [{ url: azureImage, altText: "Azure Garden suit front view", viewLabel: "front" }, { url: azureBack, altText: "Azure Garden suit back view", viewLabel: "back" }], priceRange: { min: PKR("2249.00"), max: PKR("2249.00") }, options: [{ name: "Title", values: ["Default Title"] }], variants: [{ id: "local-azure-default", title: "Default Title", price: PKR("2249.00"), compareAtPrice: PKR("4499.00"), availableForSale: true, selectedOptions: [{ name: "Title", value: "Default Title" }] }] },
  { id: "local-product-sandstone", handle: "sandstone-column-abaya", title: "Sandstone Column Abaya", description: "An easy sandstone abaya with a quiet fall and considered column line.", descriptionHtml: "", productType: "Abaya", vendor: "Libaas by HAYA", tags: ["abaya"], images: [{ url: sandstoneImage, altText: "Sandstone Column Abaya" }], priceRange: { min: PKR("165.00"), max: PKR("220.00") }, options: [{ name: "Size", values: ["S", "M", "L", "XL"] }], variants: ["S", "M", "L", "XL"].map((size, index) => ({ id: `local-sandstone-${size.toLowerCase()}`, title: size, price: PKR("165.00"), compareAtPrice: PKR("220.00"), availableForSale: true, selectedOptions: [{ name: "Size", value: size }], index })).map(({ index: _index, ...variant }) => variant) },
];
let supplementalProducts: Product[] = [];

const carts = new Map<string, Cart>();
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const allProducts = () => [...localProducts, ...supplementalProducts];
const productForVariant = (variantId: string) => allProducts().flatMap(product => product.variants.map(variant => ({ product, variant }))).find(entry => entry.variant.id === variantId);
export function setSupplementalLocalProducts(products: Product[]) { supplementalProducts = copy(products); }

function refresh(cart: Cart): Cart {
  const items: CartItem[] = [];
  for (const item of cart.items) {
    const found = productForVariant(item.variantId);
    if (!found || !found.variant.availableForSale) continue;
    const cap = typeof found.variant.quantityAvailable === "number" ? found.variant.quantityAvailable : Infinity;
    const quantity = Math.min(item.quantity, cap);
    if (quantity < 1) continue;
    const next: CartItem = { ...item, productTitle: found.product.title, variantTitle: found.variant.title, image: found.product.images[0] ?? item.image, deliveryFee: found.product.deliveryFee ?? null, unitPrice: found.variant.price, quantity, lineTotal: PKR((Number(found.variant.price.amount) * quantity).toFixed(2)) };
    items.push(next);
  }
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal.amount), 0).toFixed(2);
  return { ...cart, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: PKR(subtotal), total: PKR(subtotal) };
}

export function listLocalProducts(first = 24) { return copy(allProducts().slice(0, first)); }
export function getLocalProductByHandle(handle: string) { const product = allProducts().find(item => item.handle === handle); if (!product) throw new TRPCError({ code: "NOT_FOUND", message: `Product "${handle}" not found` }); return copy(product); }
export function createLocalCart(lines: Array<{ variantId: string; quantity: number }>) { const items: CartItem[] = lines.map(line => { const found = productForVariant(line.variantId); if (!found || line.quantity < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected local product is unavailable." }); return { lineId: `local-line-${randomUUID()}`, variantId: found.variant.id, productHandle: found.product.handle, productTitle: found.product.title, variantTitle: found.variant.title, image: found.product.images[0] ?? null, deliveryFee: found.product.deliveryFee ?? null, unitPrice: found.variant.price, quantity: line.quantity, lineTotal: PKR("0.00") }; }); const cart = refresh({ id: `local-cart-${randomUUID()}`, checkoutUrl: "", items, itemCount: 0, subtotal: PKR("0.00"), total: PKR("0.00") }); carts.set(cart.id, cart); return copy(cart); }
export function getLocalCart(id: string) { const cart = carts.get(id); return cart ? copy(cart) : null; }
export function addLocalCartLines(cartId: string, lines: Array<{ variantId: string; quantity: number }>) { const cart = carts.get(cartId); if (!cart) throw new TRPCError({ code: "BAD_REQUEST", message: "Local bag was not found. Add the piece again." }); for (const line of lines) { const found = productForVariant(line.variantId); if (!found || line.quantity < 1 || !found.variant.availableForSale) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected local product is unavailable." }); const cap = typeof found.variant.quantityAvailable === "number" ? found.variant.quantityAvailable : Infinity; const current = cart.items.find(item => item.variantId === line.variantId); if (current) current.quantity = Math.min(current.quantity + line.quantity, cap); else cart.items.push({ lineId: `local-line-${randomUUID()}`, variantId: found.variant.id, productHandle: found.product.handle, productTitle: found.product.title, variantTitle: found.variant.title, image: found.product.images[0] ?? null, deliveryFee: found.product.deliveryFee ?? null, unitPrice: found.variant.price, quantity: Math.min(line.quantity, cap), lineTotal: PKR("0.00") }); } const next = refresh(cart); carts.set(cartId, next); return copy(next); }
export function updateLocalCartLines(cartId: string, updates: Array<{ lineId: string; quantity: number }>) { const cart = carts.get(cartId); if (!cart) throw new TRPCError({ code: "BAD_REQUEST", message: "Local bag was not found." }); for (const update of updates) { const item = cart.items.find(line => line.lineId === update.lineId); if (!item) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected bag line no longer exists." }); const found = productForVariant(item.variantId); const cap = typeof found?.variant.quantityAvailable === "number" ? found.variant.quantityAvailable : Infinity; item.quantity = Math.min(update.quantity, cap); } cart.items = cart.items.filter(item => item.quantity > 0); const next = refresh(cart); carts.set(cartId, next); return copy(next); }
export function removeLocalCartLines(cartId: string, lineIds: string[]) { const cart = carts.get(cartId); if (!cart) throw new TRPCError({ code: "BAD_REQUEST", message: "Local bag was not found." }); cart.items = cart.items.filter(item => !lineIds.includes(item.lineId)); const next = refresh(cart); carts.set(cartId, next); return copy(next); }
