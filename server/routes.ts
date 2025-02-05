import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { tokenizationService } from "./tokenization";
import { tokenizationSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.use("/api", apiLimiter);

  // Tokenization endpoints
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

  const httpServer = createServer(app);
  return httpServer;
}
