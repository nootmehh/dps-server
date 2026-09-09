import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env
dotenv.config();

const portNumber = parseInt(process.env.PORT || "3000", 10);

// Normalize Base URL (remove trailing slash and brackets)
let baseUrl = (process.env.BASE_URL || `http://localhost:${portNumber}`).trim();
baseUrl = baseUrl.replace(/^\[+/, "").replace(/\]+$/, "").replace(/\/+$/, "");

// Determine Upload Directory
let configuredUploadDir = process.env.UPLOAD_DIR?.trim() || "";
configuredUploadDir = configuredUploadDir.replace(/^\[+/, "").replace(/\]+$/, "");

let resolvedUploadDir = path.resolve(process.cwd(), "uploads");

if (configuredUploadDir) {
  // If it's an absolute path (e.g. /home/ideatecore/client/dps/dps-server/uploads)
  if (path.isAbsolute(configuredUploadDir)) {
    resolvedUploadDir = configuredUploadDir;
  } else {
    resolvedUploadDir = path.resolve(process.cwd(), configuredUploadDir);
  }
}

// Ensure the upload directory exists
if (!fs.existsSync(resolvedUploadDir)) {
  fs.mkdirSync(resolvedUploadDir, { recursive: true });
}

export const config = {
  port: portNumber,
  env: process.env.NODE_ENV || "development",
  baseUrl,
  uploadDir: resolvedUploadDir,
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "25", 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS || "*",
};
