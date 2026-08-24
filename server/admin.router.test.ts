import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  hideStoreProduct: vi.fn().mockResolvedValue(undefined),
  deleteProductMediaForProduct: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  createStudioSuit: vi.fn().mockResolvedValue({ id: 1, title: "Midnight Rose", handle: "midnight-rose" }),
  upsertSaleOverride: vi.fn().mockResolvedValue({
    id: 1,
    productHandle: "test-product",
    regularPrice: "1440.00",
    salePrice: "1152.00",
    discountPercent: 20,
    enabled: 1,
  }),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, hideStoreProduct: dbMocks.hideStoreProduct, deleteProductMediaForProduct: dbMocks.deleteProductMediaForProduct, createStudioSuit: dbMocks.createStudioSuit, upsertSaleOverride: dbMocks.upsertSaleOverride };
});

import { issueAdminAccessToken } from "./adminAuth";
import { adminRouter } from "./routers/admin";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin router protection", () => {
  it("rejects a forged token before any category operation runs", async () => {
    const caller = adminRouter.createCaller(createContext());

    await expect(caller.category.list({ adminToken: "x".repeat(64) })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("permits a valid signed token to read protected Cloudinary status", async () => {
    const caller = adminRouter.createCaller(createContext());
    const token = issueAdminAccessToken("1122");

    await expect(caller.cloudinary.status({ adminToken: token })).resolves.toEqual({ connected: true });
  });

  it("persists an authenticated sale override that can drive discounted billing", async () => {
    const caller = adminRouter.createCaller(createContext());
    const token = issueAdminAccessToken("1122");

    await expect(caller.sales.upsert({
      adminToken: token,
      productHandle: "test-product",
      regularPrice: "1440",
      discountPercent: 20,
      enabled: true,
    })).resolves.toMatchObject({ salePrice: "1152.00", enabled: 1 });

    expect(dbMocks.upsertSaleOverride).toHaveBeenCalledWith(expect.objectContaining({
      productHandle: "test-product",
      regularPrice: "1440",
      salePrice: "1152.00",
      discountPercent: 20,
      enabled: true,
    }));
  });

  it("uses the protected removal route to hide a product only from the Libaas storefront", async () => {
    const caller = adminRouter.createCaller(createContext());
    const token = issueAdminAccessToken("1122");

    await expect(caller.products.remove({ adminToken: token, productHandle: "test-product" })).resolves.toBeUndefined();
    expect(dbMocks.hideStoreProduct).toHaveBeenCalledWith("test-product");
  });

  it("requires an explicit confirmation token before removing a product and its managed local gallery", async () => {
    const caller = adminRouter.createCaller(createContext());
    const token = issueAdminAccessToken("1122");

    await expect(caller.products.removeWithManagedMedia({ adminToken: token, productHandle: "test-product", confirmation: "DELETE_PRODUCT_AND_MEDIA" })).resolves.toEqual({ removedMedia: 2 });
    expect(dbMocks.deleteProductMediaForProduct).toHaveBeenCalledWith("test-product");
    expect(dbMocks.hideStoreProduct).toHaveBeenCalledWith("test-product");
  });

  it("creates a protected Studio suit draft before its required garment-image set is uploaded", async () => {
    const caller = adminRouter.createCaller(createContext());
    const token = issueAdminAccessToken("1122");

    await expect(caller.suits.create({ adminToken: token, title: "Midnight Rose", handle: "midnight-rose" })).resolves.toMatchObject({ title: "Midnight Rose", handle: "midnight-rose" });
    expect(dbMocks.createStudioSuit).toHaveBeenCalledWith({ adminToken: token, title: "Midnight Rose", handle: "midnight-rose" });
  });
});
