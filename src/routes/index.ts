import { Router } from "express";
import uploadRoutes from "./upload.routes.js";
import { getHealthStatus } from "../controllers/health.controller.js";

const apiRouter = Router();

// Health Check Endpoint
apiRouter.get("/health", getHealthStatus);

// Upload Endpoints (/api/upload, /api/upload/multiple)
apiRouter.use("/upload", uploadRoutes);

export default apiRouter;
