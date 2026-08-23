import { describe, expect, it } from "vitest";
import { createOrderNumber, getInitialPaymentStatus } from "./orderUtils";

describe("local order payment state", () => {
  it("marks cash on delivery orders as cash due", () => {
    expect(getInitialPaymentStatus("cod")).toBe("cash_due");
  });

  it("always records a COD order as cash due", () => {
    expect(getInitialPaymentStatus("cod")).toBe("cash_due");
  });

  it("creates a compact branded receipt number", () => {
    expect(createOrderNumber(1_700_000_000_000, "abcd1234")).toMatch(/^HAYA-[A-Z0-9]+-ABCD$/);
  });
});
