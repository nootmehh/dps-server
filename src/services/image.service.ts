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
 * Process image with Sharp:
 * - Auto-rotate based on EXIF
 * - Resize to max 2560px width/height while maintaining aspect ratio
 * - Convert to WebP format (quality: 85, effort: 4)
 * - Save directly to the destination folder on disk
 */
export async function processAndSaveImage(
  buffer: Buffer,
  originalName: string,
  subFolder: string = "media"
): Promise<ProcessedImageResult> {
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

    // Extract path starting with /uploads/
    let relativeSubPath = fileUrlOrName;
    const uploadsIndex = fileUrlOrName.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
      relativeSubPath = fileUrlOrName.substring(uploadsIndex + "/uploads/".length);
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
