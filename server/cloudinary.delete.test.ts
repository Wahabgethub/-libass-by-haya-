import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteCloudinaryImage } from "./cloudinary";

const saved = { cloud: process.env.CLOUDINARY_CLOUD_NAME, key: process.env.CLOUDINARY_API_KEY, secret: process.env.CLOUDINARY_API_SECRET };
afterEach(() => { process.env.CLOUDINARY_CLOUD_NAME = saved.cloud; process.env.CLOUDINARY_API_KEY = saved.key; process.env.CLOUDINARY_API_SECRET = saved.secret; });

describe("Cloudinary managed-media deletion", () => {
  it("uses the authenticated Admin API delete route for the selected public ID", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "local-test-cloud"; process.env.CLOUDINARY_API_KEY = "local-key"; process.env.CLOUDINARY_API_SECRET = "local-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await expect(deleteCloudinaryImage("libass-by-haya/categories/test/image", fetchMock as unknown as typeof fetch)).resolves.toEqual({ deleted: true, publicId: "libass-by-haya/categories/test/image" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("public_ids[]=libass-by-haya%2Fcategories%2Ftest%2Fimage"), expect.objectContaining({ method: "DELETE", headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) }));
  });
});
