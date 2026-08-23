import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCart: vi.fn(),
  createStoreOrder: vi.fn(),
  getStoreOrderByNumber: vi.fn(),
  getSaleOverridesByHandles: vi.fn().mockResolvedValue(new Map()),
  getDeliverySettings: vi.fn().mockResolvedValue({ freeDelivery: false, deliveryFee: "250.00" }),
}));

vi.mock("./_core/shopify", () => ({ getCart: mocks.getCart }));
vi.mock("./db", () => ({ createStoreOrder: mocks.createStoreOrder, getStoreOrderByNumber: mocks.getStoreOrderByNumber, getSaleOverridesByHandles: mocks.getSaleOverridesByHandles, getDeliverySettings: mocks.getDeliverySettings }));

import { ordersRouter } from "./routers/orders";
import type { TrpcContext } from "./_core/context";

const receipt = {
  id: 1, orderNumber: "HAYA-TEST-0001", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", addressLine2: null, city: "Lahore", postalCode: "54000", paymentMethod: "cod", paymentStatus: "cash_due", fulfillmentStatus: "placed", bankTransferReference: null, currencyCode: "PKR", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", createdAt: new Date(), updatedAt: new Date(), items: [{ id: 10, orderId: 1, productHandle: "azure-garden", productTitle: "Azure Garden Three-Piece Suit", productImageUrl: null, variantTitle: "Default Title", unitPrice: "2249.00", quantity: 1, lineTotal: "2249.00" }],
};

function context(): TrpcContext { return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("COD order receipt", () => {
  beforeEach(() => {
    mocks.getCart.mockResolvedValue({ id: "cart-test", total: { amount: "2249.00", currencyCode: "PKR" }, subtotal: { amount: "2249.00", currencyCode: "PKR" }, items: [{ productHandle: "azure-garden", productTitle: "Azure Garden Three-Piece Suit", image: undefined, variantTitle: "Default Title", unitPrice: { amount: "2249.00" }, quantity: 1, lineTotal: { amount: "2249.00" } }] });
    mocks.createStoreOrder.mockResolvedValue(receipt);
    mocks.getStoreOrderByNumber.mockResolvedValue(receipt);
  });

  it("stores complete customer and item details as a Cash on Delivery order", async () => {
    const result = await ordersRouter.createCaller(context()).create({ cartId: "cart-test", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", city: "Lahore", paymentMethod: "cod" });
    expect(mocks.createStoreOrder).toHaveBeenCalledWith(expect.objectContaining({ customerName: "Test Customer", email: "test@example.com", phone: "03000000000", paymentMethod: "cod", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", items: expect.arrayContaining([expect.objectContaining({ productTitle: "Azure Garden Three-Piece Suit", quantity: 1 })]) }));
    expect(result).toMatchObject({ orderNumber: "HAYA-TEST-0001", customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", city: "Lahore", postalCode: "54000", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", fulfillmentStatus: "placed", paymentStatus: "cash_due", items: [{ productTitle: "Azure Garden Three-Piece Suit", quantity: 1, lineTotal: "2249.00" }] });
  });

  it("returns a receipt only to the customer email associated with the order", async () => {
    const caller = ordersRouter.createCaller(context());
    await expect(caller.receipt({ orderNumber: "HAYA-TEST-0001", email: "test@example.com" })).resolves.toMatchObject({ customerName: "Test Customer", email: "test@example.com", phone: "03000000000", addressLine1: "1 Test Street", city: "Lahore", subtotal: "2249.00", deliveryFee: "250.00", total: "2499.00", fulfillmentStatus: "placed", items: [{ productTitle: "Azure Garden Three-Piece Suit", quantity: 1 }] });
    await expect(caller.receipt({ orderNumber: "HAYA-TEST-0001", email: "wrong@example.com" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
