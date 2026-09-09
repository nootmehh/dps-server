import multer from "multer";
import { config } from "../config/env.js";

// Store uploaded files in memory as Buffers so Sharp can process them without temp disk files
const storage = multer.memoryStorage();

// Supported MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "application/zip",
  "application/x-zip-compressed",
];

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe berkas "${file.mimetype}" tidak didukung. Harap unggah gambar (JPG, PNG, WebP, dsb).`));
    }
  },
});
