import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { tokenizationService } from "./tokenization";
import { tokenizationSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.use("/api", apiLimiter);

  // Bulk tokenization endpoint
  app.post("/api/bulk-tokenize", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Expected array of items" });
      }

      const results = await Promise.all(
        items.map(async (item) => {
          try {
            const { data, expiryHours } = tokenizationSchema.parse(item);
            const token = await tokenizationService.tokenize(
              data,
              req.user!.id,
              expiryHours
            );
            return { success: true, token };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
          }
        })
      );

      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  // Token management endpoints
  app.post("/api/tokens/:token/extend", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { token } = req.params;
      const { hours } = req.body;

      if (!hours || typeof hours !== "number" || hours <= 0) {
        return res.status(400).json({ message: "Invalid hours provided" });
      }

      await tokenizationService.extendTokenExpiry(token, req.user!.id, hours);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/tokens/:token/revoke", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { token } = req.params;
      await tokenizationService.revokeToken(token, req.user!.id);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  // Existing tokenization endpoints
  app.post("/api/tokenize", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { data, expiryHours } = tokenizationSchema.parse(req.body);
      const token = await tokenizationService.tokenize(
        data,
        req.user!.id,
        expiryHours
      );

      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/detokenize", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid token" });
      }

      const data = await tokenizationService.detokenize(token, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  // Add audit logs endpoint
  app.get("/api/audit-logs", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      // In a production environment, we would want to:
      // 1. Add pagination
      // 2. Add filtering options
      // 3. Add date range selection
      // 4. Add role-based access control
      // For now, we'll keep it simple
      const logs = await storage.getAuditLogs(req.user!.id);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}