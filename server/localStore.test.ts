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
});
