import { describe, expect, it } from "vitest";
import { resolveEffectivePrice } from "./salePricing";
describe("sale pricing", () => {
  it("uses a configured lower sale price and preserves the regular price", () => expect(resolveEffectivePrice("2249.00", { regularPrice: "1440.00", salePrice: "1200.00", enabled: 1 })).toEqual({ regularPrice: "1440.00", salePrice: "1200.00", effectivePrice: "1200.00" }));
  it("uses the regular price when a sale is disabled or invalid", () => { expect(resolveEffectivePrice("2249.00", { regularPrice: "1440.00", salePrice: "1200.00", enabled: 0 }).effectivePrice).toBe("1440.00"); expect(resolveEffectivePrice("2249.00", { regularPrice: "1440.00", salePrice: "1440.00", enabled: 1 }).salePrice).toBeNull(); });
});
