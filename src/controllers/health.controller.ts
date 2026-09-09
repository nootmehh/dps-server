import { Request, Response } from "express";
import { config } from "../config/env.js";

export function getHealthStatus(_req: Request, res: Response): void {
  const memoryUsage = process.memoryUsage();
  const formatMb = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;

  res.status(200).json({
    status: "ok",
    service: "DPS Media & API Server",
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.env,
    memory: {
      rss: formatMb(memoryUsage.rss),
      heapTotal: formatMb(memoryUsage.heapTotal),
      heapUsed: formatMb(memoryUsage.heapUsed),
    },
    uploadDirectory: config.uploadDir,
  });
}
