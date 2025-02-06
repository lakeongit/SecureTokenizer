import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { tokenizationService } from "./tokenization";
import { tokenizationSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { cloudScanner } from './services/cloud-scanner';
import { reportingService } from './services/reporting';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerRoutes(app: Express): Server {
  app.set('trust proxy', 1);

  setupAuth(app);
  app.use("/api", apiLimiter);

  // Get token info endpoint
  app.get("/api/tokens/:token", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { token } = req.params;
      const tokenData = await storage.getToken(token);

      if (!tokenData) {
        return res.status(404).json({ message: "Token not found" });
      }

      res.json({
        created: tokenData.created.toISOString(),
        expires: tokenData.expires.toISOString(),
        userId: tokenData.userId
      });
    } catch (err) {
      next(err);
    }
  });

  // Bulk tokenization endpoint with duplicate detection
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
            const serializedData = JSON.stringify(data);

            // Check for existing token with the same data
            const existingToken = await storage.getTokenBySensitiveData(serializedData);
            if (existingToken) {
              return {
                success: false,
                isDuplicate: true,
                error: "Data already tokenized",
                existingToken: existingToken.token,
                expiryDate: existingToken.expires
              };
            }

            const token = await tokenizationService.tokenize(
              data,
              req.user!.id,
              expiryHours
            );
            return { success: true, token };
          } catch (err) {
            return {
              success: false,
              isDuplicate: false,
              error: err instanceof Error ? err.message : "Unknown error"
            };
          }
        })
      );

      // Count duplicates and failures
      const duplicates = results.filter(r => r.isDuplicate).length;
      const failures = results.filter(r => !r.success && !r.isDuplicate).length;
      const successes = results.filter(r => r.success).length;

      res.json({
        results,
        summary: {
          total: items.length,
          processed: successes,
          duplicates,
          failures
        }
      });
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

  app.post("/api/tokenize", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { data, expiryHours } = tokenizationSchema.parse(req.body);

      // Check for existing token with the same data
      const serializedData = JSON.stringify(data);
      const existingToken = await storage.getTokenBySensitiveData(serializedData);
      if (existingToken) {
        return res.status(409).json({
          message: "Data already tokenized",
          existingToken: existingToken.token,
          expiryDate: existingToken.expires
        });
      }

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

  app.get("/api/audit-logs", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const logs = await storage.getAuditLogs(req.user!.id);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  // Add new endpoint for expiring tokens
  app.get("/api/tokens/expiring/:days", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const days = parseInt(req.params.days) || 30;
      const tokens = await storage.getExpiringTokens(req.user!.id, days);

      res.json(tokens.map(token => ({
        token: token.token,
        created: token.created.toISOString(),
        expires: token.expires.toISOString()
      })));
    } catch (err) {
      next(err);
    }
  });

  // Add bulk token operations endpoint
  app.post("/api/tokens/bulk-extend", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { tokens, hours } = req.body;
      if (!Array.isArray(tokens) || !hours || typeof hours !== "number" || hours <= 0) {
        return res.status(400).json({ message: "Invalid request parameters" });
      }

      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            await tokenizationService.extendTokenExpiry(token, req.user!.id, hours);
            return { token, success: true };
          } catch (error) {
            return { token, success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
        })
      );

      res.json({
        results,
        summary: {
          total: tokens.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/tokens/bulk-revoke", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { tokens } = req.body;
      if (!Array.isArray(tokens)) {
        return res.status(400).json({ message: "Invalid request parameters" });
      }

      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            await tokenizationService.revokeToken(token, req.user!.id);
            return { token, success: true };
          } catch (error) {
            return { token, success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
        })
      );

      res.json({
        results,
        summary: {
          total: tokens.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Reporting endpoints
  app.get("/api/reports/tokenization", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const timeRange = req.query.timeRange ? {
        start: new Date(req.query.timeRange.toString().split(',')[0]),
        end: new Date(req.query.timeRange.toString().split(',')[1])
      } : undefined;

      const metrics = await reportingService.getTokenizationMetrics(req.user!.id, timeRange);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/scanner", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const timeRange = req.query.timeRange ? {
        start: new Date(req.query.timeRange.toString().split(',')[0]),
        end: new Date(req.query.timeRange.toString().split(',')[1])
      } : undefined;

      const metrics = await reportingService.getScannerMetrics(timeRange);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/compliance", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const metrics = await reportingService.getComplianceMetrics(req.user!.id);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/performance", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const timeRange = req.query.timeRange ? {
        start: new Date(req.query.timeRange.toString().split(',')[0]),
        end: new Date(req.query.timeRange.toString().split(',')[1])
      } : undefined;

      const metrics = await reportingService.getPerformanceMetrics(req.user!.id, timeRange);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  });

  // Cloud Scanner endpoints
  app.post("/api/scanner/start", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      await cloudScanner.start();
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/scanner/stop", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      await cloudScanner.stop();
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/scanner/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const status = await cloudScanner.getStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/scanner/config", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      await cloudScanner.updateConfig(req.body);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}