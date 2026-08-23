import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listStoreOrders: vi.fn().mockResolvedValue([{ id: 1, orderNumber: "HAYA-TEST-0001", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", city: "Lahore", currencyCode: "PKR", deliveryFee: "250.00", total: "2499.00", fulfillmentStatus: "placed", createdAt: new Date() }]),
  listStoreOrdersPage: vi.fn().mockResolvedValue({ items: [{ id: 1, orderNumber: "HAYA-TEST-0001", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", city: "Lahore", currencyCode: "PKR", deliveryFee: "250.00", total: "2499.00", fulfillmentStatus: "placed", createdAt: new Date() }], total: 1, nextOffset: null }),
  getStoreOrderByNumber: vi.fn().mockResolvedValue({ orderNumber: "HAYA-TEST-0001", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", addressLine2: "Suite 1", city: "Lahore", postalCode: "54000", currencyCode: "PKR", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", fulfillmentStatus: "processing", items: [{ productTitle: "Azure Garden Three-Piece Suit", quantity: 1, lineTotal: "2249.00" }] }),
  updateStoreOrderFulfillmentStatus: vi.fn().mockResolvedValue({ orderNumber: "HAYA-TEST-0001", fulfillmentStatus: "fulfilled" }),
}));

vi.mock("./db", () => ({
  addCategoryImage: vi.fn(), createStoreCategory: vi.fn(), getStoreOrderByNumber: mocks.getStoreOrderByNumber, listCategoryImages: vi.fn(), listStoreCategories: vi.fn(), listStoreOrders: mocks.listStoreOrders, listStoreOrdersPage: mocks.listStoreOrdersPage, updateStoreCategoryHeroImage: vi.fn(), updateStoreOrderFulfillmentStatus: mocks.updateStoreOrderFulfillmentStatus,
}));

import { issueAdminAccessToken } from "./adminAuth";
import { adminRouter } from "./routers/admin";
import type { TrpcContext } from "./_core/context";
function context(): TrpcContext { return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("protected COD order administration", () => {
  it("lists contact details and permits a signed administrator to update fulfillment", async () => {
    const caller = adminRouter.createCaller(context()); const adminToken = issueAdminAccessToken("1122");
    await expect(caller.orders.list({ adminToken })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ email: "test@example.com", phone: "03000000000", deliveryFee: "250.00", total: "2499.00" })]));
    await expect(caller.orders.page({ adminToken, offset: 0, limit: 50 })).resolves.toMatchObject({ total: 1, nextOffset: null, items: [expect.objectContaining({ orderNumber: "HAYA-TEST-0001", deliveryFee: "250.00", total: "2499.00" })] });
    await expect(caller.orders.byNumber({ adminToken, orderNumber: "HAYA-TEST-0001" })).resolves.toMatchObject({ customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", addressLine2: "Suite 1", city: "Lahore", postalCode: "54000", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", items: [{ productTitle: "Azure Garden Three-Piece Suit", quantity: 1, lineTotal: "2249.00" }], fulfillmentStatus: "processing" });
    await expect(caller.orders.updateFulfillment({ adminToken, orderNumber: "HAYA-TEST-0001", fulfillmentStatus: "fulfilled" })).resolves.toMatchObject({ fulfillmentStatus: "fulfilled" });
  });
});
