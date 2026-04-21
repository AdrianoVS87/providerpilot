import { Request, Response, NextFunction } from "express";

const API_KEY = process.env.API_KEY || "pp-demo-key-2026";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Health check is public
  if (req.path === "/api/health") return next();

  // Allow GET requests for demo purposes (read-only is safe)
  if (req.method === "GET") return next();

  // POST/PUT/DELETE require API key
  const key = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (!key || key !== API_KEY) {
    res.status(401).json({ error: "Unauthorized. Provide X-API-Key header." });
    return;
  }

  next();
}
