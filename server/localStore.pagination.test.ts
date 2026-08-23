import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let testDir = "";
beforeEach(() => { testDir = mkdtempSync(path.join(os.tmpdir(), "libass-order-pages-")); process.env.LIBASS_DATA_DIR = testDir; vi.resetModules(); });
afterEach(() => { delete process.env.LIBASS_DATA_DIR; rmSync(testDir, { recursive: true, force: true }); });

describe("local Studio order pagination", () => {
  it("returns consecutive 50-order pages across a 1,000-record local ledger", async () => {
    const createdAt = "2026-08-23T00:00:00.000Z";
    const orders = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1, orderNumber: `HAYA-LOAD-${String(index + 1).padStart(4, "0")}`, customerName: "Load verification", email: "load@example.test", phone: "03000000000", addressLine1: "Local test address", addressLine2: null, city: "Lahore", postalCode: null, paymentMethod: "cod", paymentStatus: "cash_due", bankTransferReference: null, fulfillmentStatus: "placed", currencyCode: "PKR", subtotal: "100.00", deliveryFee: "0.00", total: "100.00", createdAt, updatedAt: createdAt, items: [] }));
    mkdirSync(testDir, { recursive: true });
    writeFileSync(path.join(testDir, "libass-store.json"), JSON.stringify({ version: 1, sequences: { order: 1001 }, users: [], categories: [], categoryImages: [], saleOverrides: [], hiddenProducts: [], productMedia: [], orders, reviews: [], delivery: { freeDelivery: false, deliveryFee: "0.00", updatedAt: createdAt } }));
    const db = await import("./db");
    const first = await db.listStoreOrdersPage({ offset: 0, limit: 50 });
    const twentieth = await db.listStoreOrdersPage({ offset: 950, limit: 50 });
    expect(first).toMatchObject({ total: 1000, items: expect.any(Array), nextOffset: 50 });
    expect(first.items).toHaveLength(50);
    expect(twentieth).toMatchObject({ total: 1000, nextOffset: null });
    expect(twentieth.items).toHaveLength(50);
  });
});
