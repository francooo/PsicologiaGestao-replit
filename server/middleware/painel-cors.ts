import type { Request, Response, NextFunction } from "express";

/** Origins of the owner panel (painel do dono), from PAINEL_ORIGIN (comma-separated). */
export function painelOrigins(): string[] {
  return (process.env.PAINEL_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

// Only what the panel calls: platform routes plus login/user/logout (Bearer tokens, no cookies)
const PAINEL_PATHS = /^\/api\/(platform\/.*|mobile\/login|user|logout)$/;

/** CORS for the owner panel, which runs on another origin. Register before the routes. */
export function painelCors() {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (!origin || !PAINEL_PATHS.test(req.path) || !painelOrigins().includes(origin)) return next();
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.vary("Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  };
}
