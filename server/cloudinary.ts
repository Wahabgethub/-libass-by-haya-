import { createHash } from "node:crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not completely configured");
  }

  return { cloudName, apiKey, apiSecret };
}

export function getCloudinaryUploadSignature(folder: string) {
  const { apiKey, apiSecret, cloudName } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  return { apiKey, cloudName, folder, signature, timestamp };
}

export async function validateCloudinaryCredentials(fetchImpl: typeof fetch = fetch) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const response = await fetchImpl(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image?max_results=1`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );

  if (!response.ok) {
    throw new Error(`Cloudinary credentials could not be verified (HTTP ${response.status})`);
  }

  return { valid: true as const, cloudName };
}

export async function deleteCloudinaryImage(publicId: string, fetchImpl: typeof fetch = fetch) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const response = await fetchImpl(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`,
    { method: "DELETE", headers: { Authorization: `Basic ${credentials}` } },
  );
  if (!response.ok) throw new Error(`Cloudinary image could not be deleted (HTTP ${response.status})`);
  return { deleted: true as const, publicId };
}

export async function uploadImageToCloudinary(input: { dataUrl: string; folder: string }, fetchImpl: typeof fetch = fetch) {
  const { apiKey, apiSecret, cloudName } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${input.folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const form = new FormData();
  form.append("file", input.dataUrl);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", input.folder);
  const response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary upload failed (HTTP ${response.status})`);
  const data = (await response.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}
