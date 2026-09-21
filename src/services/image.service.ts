import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { config } from "../config/env.js";

export interface ProcessedImageResult {
  url: string;
  relativeUrl: string;
  fileName: string;
  originalName: string;
  fileSize: string;
  fileSizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function sanitizeFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return safeBase || "file";
}

/**
 * Save file directly without converting to WebP (for hero image/video, preserving original format and full resolution)
 */
export async function saveOriginalFile(
  buffer: Buffer,
  originalName: string,
  subFolder: string = "site",
  mimeType?: string
): Promise<ProcessedImageResult> {
  const cleanFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "site";
  const targetDir = path.join(config.uploadDir, cleanFolder);

  // Ensure target folder exists
  await fs.mkdir(targetDir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase() || (mimeType?.includes("video") ? ".mp4" : ".png");
  const baseName = path.basename(originalName, ext);
  const safeBaseName = sanitizeFileName(baseName);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const savedFileName = `${timestamp}_${randomSuffix}_${safeBaseName}${ext}`;
  const destinationPath = path.join(targetDir, savedFileName);

  // Write raw buffer directly to disk
  await fs.writeFile(destinationPath, buffer);

  const relativeUrl = `/uploads/${cleanFolder}/${savedFileName}`;
  const fullUrl = `${config.baseUrl}${relativeUrl}`;

  let width: number | undefined;
  let height: number | undefined;

  // Try extracting dimensions if it's an image without altering the buffer
  if (!mimeType?.startsWith("video/") && !ext.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
    } catch {
      // ignore
    }
  }

  return {
    url: fullUrl,
    relativeUrl,
    fileName: savedFileName,
    originalName,
    fileSize: formatBytes(buffer.length),
    fileSizeBytes: buffer.length,
    mimeType: mimeType || (ext.match(/\.(mp4|webm|mov)$/i) ? "video/mp4" : "image/jpeg"),
    width,
    height,
  };
}

/**
 * Process image with Sharp:
 * - If noConvert or hero/site folder or video: save original without conversion
 * - Otherwise: auto-rotate, resize to max 2560px, convert to WebP
 * - Save directly to the destination folder on disk
 */
export async function processAndSaveImage(
  buffer: Buffer,
  originalName: string,
  subFolder: string = "media",
  options?: { noConvert?: boolean; mimeType?: string; isFavicon?: boolean }
): Promise<ProcessedImageResult> {
  const ext = path.extname(originalName).toLowerCase();
  const isVideo = options?.mimeType?.startsWith("video/") || !!ext.match(/\.(mp4|webm|mov|avi|mkv)$/i);
  const isSvg = options?.mimeType === "image/svg+xml" || ext === ".svg";

  // Auto-resize favicons to 192x192 (multiple of 48: 48x4) with transparent background
  const isFavicon = options?.isFavicon || subFolder === "favicon" || originalName.toLowerCase().includes("favicon");
  if (isFavicon && !isVideo && !isSvg) {
    const cleanFolder = "site";
    const targetDir = path.join(config.uploadDir, cleanFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const safeBaseName = sanitizeFileName(originalName);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const pngFileName = `${timestamp}_${randomSuffix}_${safeBaseName}_192.png`;
    const destinationPath = path.join(targetDir, pngFileName);

    const { data, info } = await sharp(buffer)
      .rotate()
      .resize(192, 192, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(destinationPath, data);

    const relativeUrl = `/uploads/${cleanFolder}/${pngFileName}`;
    const fullUrl = `${config.baseUrl}${relativeUrl}`;

    return {
      url: fullUrl,
      relativeUrl,
      fileName: pngFileName,
      originalName,
      fileSize: formatBytes(info.size),
      fileSizeBytes: info.size,
      mimeType: "image/png",
      width: 192,
      height: 192,
    };
  }

  const shouldPreserve = options?.noConvert || subFolder === "site" || subFolder === "hero" || isVideo || isSvg;

  if (shouldPreserve) {
    return saveOriginalFile(buffer, originalName, subFolder, options?.mimeType);
  }

  const cleanFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "media";
  const targetDir = path.join(config.uploadDir, cleanFolder);

  // Ensure target folder exists
  await fs.mkdir(targetDir, { recursive: true });

  const safeBaseName = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const webpFileName = `${timestamp}_${randomSuffix}_${safeBaseName}.webp`;
  const destinationPath = path.join(targetDir, webpFileName);

  // Process image with Sharp
  const sharpPipeline = sharp(buffer)
    .rotate() // Auto-orient according to EXIF
    .resize({
      width: 2560,
      height: 2560,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,
      effort: 4,
    });

  const { data, info } = await sharpPipeline.toBuffer({ resolveWithObject: true });

  // Write optimized WebP buffer to disk
  await fs.writeFile(destinationPath, data);

  const relativeUrl = `/uploads/${cleanFolder}/${webpFileName}`;
  const fullUrl = `${config.baseUrl}${relativeUrl}`;

  return {
    url: fullUrl,
    relativeUrl,
    fileName: webpFileName,
    originalName,
    fileSize: formatBytes(info.size),
    fileSizeBytes: info.size,
    mimeType: "image/webp",
    width: info.width,
    height: info.height,
  };
}

/**
 * Delete a file from disk
 */
export async function deleteUploadedFile(fileUrlOrName: string): Promise<boolean> {
  try {
    if (!fileUrlOrName) return false;

    // Strip query parameters and decode URL
    const cleanUrl = fileUrlOrName.split("?")[0].trim();
    let relativeSubPath = decodeURIComponent(cleanUrl);

    // Extract path starting with /uploads/
    const uploadsIndex = relativeSubPath.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
      relativeSubPath = relativeSubPath.substring(uploadsIndex + "/uploads/".length);
    }

    // Prevent path traversal
    const safePath = path.normalize(relativeSubPath).replace(/^(\.\.[\/\\])+/, "");
    const fullDiskPath = path.join(config.uploadDir, safePath);

    await fs.unlink(fullDiskPath);
    return true;
  } catch (err: any) {
    // If file doesn't exist, consider it already deleted
    if (err.code === "ENOENT") return true;
    console.error("Failed to delete file from disk:", err);
    return false;
  }
}

export interface DiskMediaItem {
  id: string;
  url: string;
  relativeUrl: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes: number;
  uploadedAt: string;
  createdAt: string;
}

/**
 * List files from uploads directory on VPS disk
 */
export async function listDiskFiles(subFolder: string = "media"): Promise<DiskMediaItem[]> {
  try {
    const cleanFolder = subFolder.replace(/[^a-zA-Z0-9_-]/g, "") || "media";
    const targetDir = path.join(config.uploadDir, cleanFolder);

    await fs.mkdir(targetDir, { recursive: true });
    const dirEntries = await fs.readdir(targetDir, { withFileTypes: true });

    const items: DiskMediaItem[] = [];

    for (const entry of dirEntries) {
      if (!entry.isFile()) continue;
      const fileName = entry.name;
      // Filter image extensions
      const ext = path.extname(fileName).toLowerCase();
      if (![".webp", ".png", ".jpg", ".jpeg", ".svg", ".gif"].includes(ext)) continue;

      const filePath = path.join(targetDir, fileName);
      try {
        const stats = await fs.stat(filePath);
        const relativeUrl = `/uploads/${cleanFolder}/${fileName}`;
        const fullUrl = `${config.baseUrl}${relativeUrl}`;

        items.push({
          id: fileName,
          url: fullUrl,
          relativeUrl,
          fileName,
          fileSize: formatBytes(stats.size),
          fileSizeBytes: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          createdAt: stats.birthtime.toISOString(),
        });
      } catch {
        // ignore individual file stat error
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return items;
  } catch (err) {
    console.error("Failed to list files from disk:", err);
    return [];
  }
}
