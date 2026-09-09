import { Request, Response, NextFunction } from "express";
import multer from "multer";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Server Error:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        error: "Ukuran berkas melebihi batas maksimum yang diizinkan.",
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `Kesalahan unggah: ${err.message}`,
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Terjadi kesalahan internal server.",
  });
}
