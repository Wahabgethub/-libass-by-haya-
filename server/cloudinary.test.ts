import { describe, expect, it } from "vitest";
import { validateCloudinaryCredentials } from "./cloudinary";

describe("Cloudinary credentials", () => {
  it("can authenticate with the configured Cloudinary account", async () => {
    const result = await validateCloudinaryCredentials();

    expect(result.valid).toBe(true);
    expect(result.cloudName.trim().length).toBeGreaterThan(0);
  }, 15_000);
});
