import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});

export function browserRequestGuard(req, res, next) {
  res.set("Cache-Control", "no-store");
  res.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origins = new Set([env.origin, `${req.protocol}://${req.get("host")}`]);
  let source = req.headers.origin;
  if (!source && req.headers.referer) {
    try {
      source = new URL(req.headers.referer).origin;
    } catch {
      source = "invalid";
    }
  }
  if (
    req.headers["sec-fetch-site"] === "cross-site" ||
    (source && !origins.has(source))
  )
    return res.status(403).json({ message: "Request origin is not allowed." });
  // Cookie-authenticated browser mutations use JSON; forms cannot submit it
  // cross-origin without a preflight. Bodyless logout/read actions remain valid.
  if (
    Number(req.headers["content-length"] || 0) > 0 ||
    req.headers["transfer-encoding"]
  ) {
    if (!req.is("application/json"))
      return res
        .status(415)
        .json({ message: "Send request bodies as application/json." });
  }
  next();
}
