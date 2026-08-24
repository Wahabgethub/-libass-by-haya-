import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let testDir = "";
beforeEach(() => { testDir = mkdtempSync(path.join(os.tmpdir(), "libass-local-store-")); process.env.LIBASS_DATA_DIR = testDir; vi.resetModules(); });
afterEach(() => { delete process.env.LIBASS_DATA_DIR; rmSync(testDir, { recursive: true, force: true }); });

describe("portable local Libass store", () => {
  it("persists locally uploaded garment views, delivery rules, and order delivery snapshots", async () => {
    const db = await import("./db");
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZrwAAAABJRU5ErkJggg==";
    const uploaded = await db.saveLocalImageUpload({ fileName: "azure-back.png", mimeType: "image/png", dataUrl: pixel });
    expect(uploaded.url).toMatch(/^\/uploads\//);
    expect(existsSync(path.join(testDir, "uploads", uploaded.storageKey))).toBe(true);
    await db.addProductMedia({ productHandle: "azure-garden", title: "Azure Garden back", imageUrl: uploaded.url, storageKey: uploaded.storageKey, viewLabel: "back", sortOrder: 0, altText: "Azure Garden back view" });
    await expect(db.listProductMedia("azure-garden")).resolves.toMatchObject([{ viewLabel: "back", imageUrl: uploaded.url }]);

    await db.updateDeliverySettings({ freeDelivery: false, deliveryFee: "250" });
    await expect(db.getDeliverySettings()).resolves.toMatchObject({ freeDelivery: false, deliveryFee: "250.00" });
    const order = await db.createStoreOrder({ customerName: "Local Customer", email: "local@example.test", phone: "03000000000", addressLine1: "Local Street", city: "Lahore", paymentMethod: "cod", currencyCode: "PKR", subtotal: "2249", deliveryFee: "250", total: "2499", items: [{ productHandle: "azure-garden", productTitle: "Azure Garden", unitPrice: "2249", quantity: 1, lineTotal: "2249" }] });
    expect(order.deliveryFee).toBe("250.00");
    expect(order.total).toBe("2499.00");
    await expect(db.listReviews("azure-garden")).resolves.toEqual([]);
    const persisted = JSON.parse(readFileSync(path.join(testDir, "libass-store.json"), "utf8"));
    expect(persisted.orders).toHaveLength(1);
    expect(persisted.productMedia).toHaveLength(1);
  });

  it("keeps six ordered garment views isolated to each suit and separate from Cut to Move frames", async () => {
    const db = await import("./db");
    const azure = [] as Array<{ id: number }>;
    for (let index = 0; index < 6; index += 1) {
      azure.push(await db.addProductMedia({ productHandle: "azure-garden", title: `Azure view ${index + 1}`, imageUrl: `/uploads/azure-${index + 1}.jpg`, storageKey: "", viewLabel: index === 0 ? "front" : "detail", sortOrder: index, altText: `Azure view ${index + 1}` }));
    }
    await db.addProductMedia({ productHandle: "rose-suit", title: "Rose front", imageUrl: "/uploads/rose-front.jpg", storageKey: "", viewLabel: "front", sortOrder: 0 });
    await expect(db.addProductMedia({ productHandle: "azure-garden", title: "Too many", imageUrl: "/uploads/too-many.jpg", storageKey: "", viewLabel: "other", sortOrder: 6 })).rejects.toThrow(/up to 6 gallery images/i);
    await expect(db.listProductMedia("azure-garden")).resolves.toHaveLength(6);
    await expect(db.listProductMedia("rose-suit")).resolves.toMatchObject([{ title: "Rose front" }]);

    const reverseOrder = azure.map(item => item.id).reverse();
    await db.reorderProductMedia({ productHandle: "azure-garden", ids: reverseOrder });
    const reorderedAzure = await db.listProductMedia("azure-garden");
    expect(reorderedAzure[0]?.id).toBe(reverseOrder[0]);

    await db.addMotionMedia({ title: "Motion frame", imageUrl: "/uploads/motion.jpg", storageKey: "", sortOrder: 0 });
    await expect(db.listMotionMedia()).resolves.toMatchObject([{ title: "Motion frame" }]);
    await db.deleteProductMediaForProduct("azure-garden");
    await expect(db.listProductMedia("azure-garden")).resolves.toEqual([]);
    await expect(db.listProductMedia("rose-suit")).resolves.toHaveLength(1);
    await expect(db.listMotionMedia()).resolves.toHaveLength(1);
  });

  it("creates a separately named Studio suit draft before its three-image gallery is uploaded", async () => {
    const db = await import("./db");
    const suit = await db.createStudioSuit({ title: "Midnight Rose Three-Piece Suit", handle: "midnight-rose-three-piece-suit" });
    await expect(db.listStudioSuits()).resolves.toMatchObject([{ id: suit.id, title: "Midnight Rose Three-Piece Suit", handle: "midnight-rose-three-piece-suit" }]);
    await expect(db.createStudioSuit({ title: "Duplicate", handle: "midnight-rose-three-piece-suit" })).rejects.toThrow(/already uses that handle/i);
  });

  it("persists color, style, and season metadata for visitor catalog filtering", async () => {
    const db = await import("./db");
    await db.upsertSuitFilterMeta({ productHandle: "azure-garden-three-piece-suit", color: "Azure blue", style: "Three-piece suit", season: "Spring / Summer" });
    await expect(db.listSuitFilterMeta()).resolves.toMatchObject([{ productHandle: "azure-garden-three-piece-suit", color: "Azure blue", style: "Three-piece suit", season: "Spring / Summer" }]);
  });

  it("locks front, back, and detail before allowing extra editorial-view reordering", async () => {
    const db = await import("./db");
    const views = [] as Array<{ id: number }>;
    for (const [index, viewLabel] of ["front", "back", "detail", "editorial", "other"].entries()) {
      views.push(await db.addProductMedia({ productHandle: "midnight-rose", title: `Midnight Rose ${viewLabel}`, imageUrl: `/uploads/${viewLabel}.jpg`, storageKey: "", viewLabel, sortOrder: index }));
    }
    await expect(db.reorderProductMedia({ productHandle: "midnight-rose", ids: [views[0]!.id, views[1]!.id, views[2]!.id, views[4]!.id, views[3]!.id] })).resolves.toHaveLength(5);
    await expect(db.reorderProductMedia({ productHandle: "midnight-rose", ids: [views[1]!.id, views[0]!.id, views[2]!.id, views[4]!.id, views[3]!.id] })).rejects.toThrow(/stay locked/i);
  });

  it("publishes a ready Studio suit with regular and optional sale prices", async () => {
    const db = await import("./db");
    await db.createStudioSuit({ title: "Ivory Dawn", handle: "ivory-dawn" });
    const published = await db.publishStudioSuit({ productHandle: "ivory-dawn", title: "Ivory Dawn Three-Piece Suit", description: "A refined ivory three-piece suit for considered everyday dressing.", regularPrice: "4499", salePrice: "2999" });
    expect(published).toMatchObject({ productHandle: "ivory-dawn", regularPrice: "4499.00", salePrice: "2999.00" });
    await expect(db.publishStudioSuit({ productHandle: "ivory-dawn", title: "Ivory Dawn Three-Piece Suit", description: "A refined ivory three-piece suit for considered everyday dressing.", regularPrice: "2999", salePrice: "4499" })).rejects.toThrow(/lower than the regular/i);
  });
});
