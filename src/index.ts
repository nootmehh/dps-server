import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { config } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// 1. CORS Configuration
const corsOptions: cors.CorsOptions = {
  origin: config.allowedOrigins === "*" ? true : config.allowedOrigins.split(",").map((o) => o.trim()),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 2. Request Logging
if (config.env !== "test") {
  app.use(morgan(config.env === "production" ? "combined" : "dev"));
}

// 3. Body Parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 4. Serve Static Uploaded Files
// Makes any file in uploads accessible at http://.../uploads/...
app.use(
  "/uploads",
  express.static(config.uploadDir, {
    maxAge: "30d",
    etag: true,
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// 5. Root status check
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "DPS Dedicated Media Processing & API Server",
    status: "running",
    version: "1.0.0",
    healthCheck: "/api/health",
    uploadEndpoint: "/api/upload",
    storageDirectory: config.uploadDir,
  });
});

// 6. Mount API Routes
app.use("/api", apiRoutes);

// 7. Global Error Handler
app.use(errorHandler);

// 8. Start HTTP Server
app.listen(config.port, "0.0.0.0", () => {
  console.log("==================================================");
  console.log(`🚀 DPS Server running on port ${config.port}`);
  console.log(`📡 Base URL: ${config.baseUrl}`);
  console.log(`📁 Upload Storage: ${config.uploadDir}`);
  console.log(`🖼️  Static Media Serving: ${config.baseUrl}/uploads`);
  console.log(`🩺 Health check: ${config.baseUrl}/api/health`);
  console.log("==================================================");
});

export default app;
