import "dotenv/config";
import express from "express";
import multer from "multer";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { addMotionMedia, addProductMedia, listMotionMedia, listProductMedia, listStudioSuits, saveImageUpload, MAX_PRODUCT_MEDIA } from "../db";
import { assertValidAdminAccessToken } from "../adminAuth";
import { assertNextStudioSuitView } from "../suitMediaRules";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const localMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 6 } });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(path.join(process.env.LIBASS_DATA_DIR || path.join(process.cwd(), "data"), "uploads")));
  app.post("/api/admin/local-media", localMediaUpload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: MAX_PRODUCT_MEDIA }]), async (req, res) => {
    try {
      const token = String(req.body?.adminToken ?? "");
      assertValidAdminAccessToken(token);
      const productHandle = String(req.body?.productHandle ?? "");
      const title = String(req.body?.title ?? "");
      const viewLabel = String(req.body?.viewLabel ?? "");
      const altText = String(req.body?.altText ?? "");
      const sortOrder = Number(req.body?.sortOrder ?? 0);
      const groupedFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
      const files = [...(groupedFiles?.files ?? []), ...(groupedFiles?.file ?? [])];
      const labels = typeof req.body?.viewLabels === "string" ? JSON.parse(req.body.viewLabels) : [viewLabel];
      if (!productHandle || !title || !files.length || !Array.isArray(labels) || labels.length !== files.length || labels.some(label => !["front", "back", "detail", "editorial", "other"].includes(String(label))) || files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) || !file.buffer.length)) return res.status(400).json({ message: "Choose valid garment images and view labels." });
      const existing = await listProductMedia(productHandle);
      const studioDraft = (await listStudioSuits()).some(suit => suit.handle === productHandle);
      if (studioDraft) assertNextStudioSuitView(existing.length, labels, files.length);
      if (existing.length + files.length > MAX_PRODUCT_MEDIA) return res.status(400).json({ message: `Each suit can have up to ${MAX_PRODUCT_MEDIA} gallery images. Remove a view before adding another.` });
      const media = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const uploaded = await saveImageUpload({ fileName: file.originalname, mimeType: file.mimetype as "image/jpeg" | "image/png" | "image/webp", dataUrl: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`, folder: "libaas/suits" });
        media.push(await addProductMedia({ productHandle, title: `${title} ${labels[index]} view`, imageUrl: uploaded.url, storageKey: uploaded.storageKey, viewLabel: labels[index] as "front" | "back" | "detail" | "editorial" | "other", sortOrder: Number.isFinite(sortOrder) ? sortOrder + index : index, altText: altText || undefined }));
      }
      res.status(201).json(media);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Garment image could not be saved locally.";
      res.status(403).json({ message });
    }
  });
  app.post("/api/admin/motion-media", localMediaUpload.single("file"), async (req, res) => {
    try {
      const token = String(req.body?.adminToken ?? "");
      assertValidAdminAccessToken(token);
      const title = String(req.body?.title ?? "");
      const altText = String(req.body?.altText ?? "");
      const sortOrder = Number(req.body?.sortOrder ?? 0);
      const file = req.file;
      if (!title || !file || !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) || !file.buffer.length) return res.status(400).json({ message: "Choose a valid Cut to Move image." });
      if ((await listMotionMedia()).length >= MAX_PRODUCT_MEDIA) return res.status(400).json({ message: `Cut to Move can have up to ${MAX_PRODUCT_MEDIA} motion images. Remove a frame before adding another.` });
      const uploaded = await saveImageUpload({ fileName: file.originalname, mimeType: file.mimetype as "image/jpeg" | "image/png" | "image/webp", dataUrl: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`, folder: "libaas/motion" });
      const media = await addMotionMedia({ title, imageUrl: uploaded.url, storageKey: uploaded.storageKey, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, altText: altText || undefined });
      res.status(201).json(media);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cut to Move image could not be saved locally.";
      res.status(403).json({ message });
    }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
