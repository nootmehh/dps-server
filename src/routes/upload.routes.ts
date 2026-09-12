import { Router } from "express";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { uploadSingle, uploadMultiple, deleteFile, listFiles } from "../controllers/upload.controller.js";

const router = Router();

// List uploaded files from VPS disk
router.get(
  "/",
  listFiles
);

// Single file upload (accepts field name 'file' or 'image')
router.post(
  "/",
  uploadMiddleware.single("file"),
  uploadSingle
);

// Multiple files upload (accepts field name 'files' or 'images')
router.post(
  "/multiple",
  uploadMiddleware.array("files", 25),
  uploadMultiple
);

// Delete uploaded file
router.delete(
  "/",
  deleteFile
);

export default router;
