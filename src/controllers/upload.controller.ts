import { Request, Response, NextFunction } from "express";
import { processAndSaveImage, deleteUploadedFile } from "../services/image.service.js";

/**
 * Handle single image upload
 * POST /api/upload
 */
export async function uploadSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file || (Array.isArray(req.files) ? req.files[0] : null);

    if (!file) {
      res.status(400).json({
        success: false,
        message: "Tidak ada berkas yang diunggah. Kirimkan berkas dengan field 'file'.",
      });
      return;
    }

    const folder = (req.body.folder as string) || "media";
    const result = await processAndSaveImage(file.buffer, file.originalname, folder);

    res.status(200).json({
      success: true,
      message: "Berkas berhasil diproses dan diunggah.",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle multiple images upload
 * POST /api/upload/multiple
 */
export async function uploadMultiple(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: "Tidak ada berkas yang diunggah. Kirimkan berkas dengan field 'files'.",
      });
      return;
    }

    const folder = (req.body.folder as string) || "media";
    const results = [];

    for (const f of files) {
      const processed = await processAndSaveImage(f.buffer, f.originalname, folder);
      results.push(processed);
    }

    res.status(200).json({
      success: true,
      message: `${results.length} berkas berhasil diproses dan diunggah.`,
      count: results.length,
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle file deletion
 * DELETE /api/upload
 */
export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUrl = (req.query.url as string) || req.body?.url || req.body?.fileName || "";

    if (!targetUrl) {
      res.status(400).json({
        success: false,
        message: "Parameter 'url' atau 'fileName' wajib disertakan.",
      });
      return;
    }

    const deleted = await deleteUploadedFile(targetUrl);

    res.status(200).json({
      success: true,
      message: deleted ? "Berkas berhasil dihapus dari server." : "Berkas tidak ditemukan atau sudah dihapus.",
    });
  } catch (err) {
    next(err);
  }
}
