import { describe, expect, it } from "vitest";

describe("public application title", () => {
  it("serves the configured Libaas by HAYA title from the storefront entry route", async () => {
    const configuredTitle = process.env.VITE_APP_TITLE;
    expect(configuredTitle).toBe("Libaas by HAYA");

    const response = await fetch("http://127.0.0.1:3000/");
    expect(response.ok).toBe(true);
    await expect(response.text()).resolves.toContain(`<title>${configuredTitle} — Modern Modest Fashion</title>`);
  });
});
