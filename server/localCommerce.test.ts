import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.stubEnv("SHOPIFY_STORE_DOMAIN", ""); vi.stubEnv("SHOPIFY_STOREFRONT_API_ACCESS_TOKEN", ""); vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("local catalog and cart fallback", () => {
  it("lists the bundled Libass catalog and completes local bag operations without Shopify credentials", async () => {
    const commerce = await import("./_core/shopify");
    const products = await commerce.listProducts({ first: 1000 });
    expect(products.map(product => product.handle)).toContain("azure-garden-three-piece-suit");
    const azure = await commerce.getProductByHandle("azure-garden-three-piece-suit");
    const cart = await commerce.createCart([{ variantId: azure.variants[0].id, quantity: 1 }]);
    expect(cart.itemCount).toBe(1);
    expect(cart.total).toMatchObject({ amount: "2249.00", currencyCode: "PKR" });
    const extended = await commerce.addCartLines(cart.id, [{ variantId: azure.variants[0].id, quantity: 1 }]);
    expect(extended.itemCount).toBe(2);
    const emptied = await commerce.removeCartLines(cart.id, [extended.items[0].lineId]);
    expect(emptied.itemCount).toBe(0);
  });

  it("adds a published Studio suit to the local COD cart", async () => {
    const local = await import("./localCommerce");
    local.setSupplementalLocalProducts([{ id: "studio-product-midnight", handle: "midnight", title: "Midnight Suit", description: "A published Studio suit.", descriptionHtml: "", productType: "Three-piece suit", vendor: "Libaas by HAYA", tags: ["suit"], images: [{ url: "/uploads/midnight-front.jpg", altText: "Midnight front", viewLabel: "front" }], priceRange: { min: { amount: "449.00", currencyCode: "PKR" }, max: { amount: "449.00", currencyCode: "PKR" } }, options: [{ name: "Title", values: ["Default Title"] }], variants: [{ id: "studio-midnight-default", title: "Default Title", price: { amount: "449.00", currencyCode: "PKR" }, compareAtPrice: null, availableForSale: true, selectedOptions: [{ name: "Title", value: "Default Title" }] }] }]);
    const cart = local.createLocalCart([{ variantId: "studio-midnight-default", quantity: 1 }]);
    expect(cart).toMatchObject({ itemCount: 1, total: { amount: "449.00", currencyCode: "PKR" }, items: [{ productHandle: "midnight", productTitle: "Midnight Suit" }] });
  });
});
