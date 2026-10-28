import type { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";
import { isPlatformAdmin, resolveCompanyContext } from "../lib/companies";

export const SESSION_COOKIE_NAME = "connect.sid";

/**
 * Signs a session id the same way express-session (cookie-signature) does,
 * so a raw session id sent by the mobile app can be turned into a valid cookie.
 */
function signSessionId(sid: string, secret: string) {
  const signature = createHmac("sha256", secret).update(sid).digest("base64").replace(/=+$/, "");
  return `s:${sid}.${signature}`;
}

/**
 * Mobile clients (Expo) can't rely on the native cookie jar, so they send the
 * session id as `Authorization: Bearer <sid>`. This rewrites it into the session
 * cookie before express-session runs, keeping every existing route unchanged.
 * Must be registered BEFORE `app.use(session(...))`.
 */
export function bearerSessionBridge(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const sid = header.slice("Bearer ".length).trim();
      if (sid && /^[\w-]+$/.test(sid)) {
        const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(signSessionId(sid, secret))}`;
        req.headers.cookie = cookie;
      }
    }
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");

/**
 * Sets req.companyId and the per-company req.user.role on every authenticated request.
 * Must be registered right after `passport.session()`.
 */
export function companyContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return next();
  resolveCompanyContext(req).then(() => next(), next);
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
  if (!req.companyId) {
    return res.status(409).json({ message: "Selecione uma empresa para continuar.", code: "NO_COMPANY" });
  }
  next();
}

export type PublicApiRoute = { method?: string; path: RegExp };

/**
 * Gate for every /api route registered after it: clinic data needs a login with an
 * active company. Only the routes listed (public pages, password reset, company
 * switching...) pass without one — so a new route is protected by default.
 */
export function requireCompanyExcept(publicRoutes: PublicApiRoute[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    const isPublic = publicRoutes.some((r) => (!r.method || r.method === req.method) && r.path.test(req.path));
    if (isPublic) return next();
    requireCompany(req, res, next);
  };
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
  if (!isPlatformAdmin(req.user.email)) return res.status(403).json({ message: "Acesso não autorizado" });
  next();
}
