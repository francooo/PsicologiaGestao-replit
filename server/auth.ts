import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, type Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { bearerSessionBridge, companyContext, requireCompany } from "./middleware/auth-guards";
import { applyPendingInvites } from "./lib/access-invites";
import { ensurePsychologistProfileFor, resolveCompanyContext, upsertMembership, userPayload } from "./lib/companies";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export { hashPassword };
async function comparePasswords(supplied: string, stored: string | null) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Mobile sessions live longer than the browser session cookie
const MOBILE_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

// Deep-link prefixes the Google callback may redirect back to (Expo Go / app scheme)
const MOBILE_REDIRECT_PREFIXES = ["exp://", "exps://", "consultapsi://"];

function isAllowedMobileRedirect(url: unknown): url is string {
  return typeof url === "string" && MOBILE_REDIRECT_PREFIXES.some((p) => url.startsWith(p));
}

declare module "express-session" {
  interface SessionData {
    mobileRedirect?: string;
  }
}

/**
 * A psychologist in the active company needs a psychologists row to use the system;
 * create it on first access.
 */
async function ensurePsychologistProfile(req: Request) {
  if (!req.user || req.user.role !== "psychologist" || !req.companyId) return;
  await ensurePsychologistProfileFor(req.companyId, req.user.id);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "r8q/+&1LM3)cd*zAGpx1xm{NeQHc;#";
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {} as any
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1); // trust first proxy
    sessionSettings.cookie = {
      secure: true
    };
  }

  app.use(bearerSessionBridge(sessionSecret));
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(companyContext);

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Accepts either email or username in the same field
        const user = username.includes("@")
          ? (await storage.getUserByEmail(username)) ?? (await storage.getUserByUsername(username))
          : await storage.getUserByUsername(username);
        // Pass user.password which might be null, comparePasswords handles it
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else if (user.status !== "active") {
          return done(null, false, { message: "Account is not active. Please contact administrator." });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Google Strategy
  // callbackURL is built dynamically per-request so it works in both dev and production
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback", // relative — overridden per-request below
      passReqToCallback: false,
    },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user exists by googleId
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            // 2. Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await storage.getUserByEmail(email);

              if (user) {
                // Link account
                await storage.updateUser(user.id, {
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value || user.profileImage, // Update avatar if not present? Or just store in avatarUrl
                });
                // Refetch updated user
                user = await storage.getUser(user.id);
              }
            }
          }

          if (!user) {
            // 3. Create new user
            const email = profile.emails?.[0]?.value;
            // Ensure username is unique - simple strategy for now
            let username = email ? email.split('@')[0] : `user${profile.id}`;
            const existingUsername = await storage.getUserByUsername(username);
            if (existingUsername) {
              username = `${username}_${Math.floor(Math.random() * 1000)}`;
            }

            user = await storage.createUser({
              username: username,
              password: "", // No password
              email: email || "",
              fullName: profile.displayName,
              role: "psychologist", // Default role
              status: "active",
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value,
            });
            // No company yet: the psychologist profile is created once they join one (ensurePsychologistProfile)
          }

          // E-mails pre-authorized by an admin get their role on first access
          user = await applyPendingInvites(user);

          if (user?.status !== "active") {
            return done(null, false, { message: "Account is not active." });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    ));

    // Helper to build the callback URL from the incoming request host
    const buildCallbackUrl = (req: any) => {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const host = req.get('x-forwarded-host') || req.get('host') || req.hostname;
      return `${proto}://${host}/auth/google/callback`;
    };

    // Google Auth Routes
    app.get('/auth/google', (req, res, next) => {
      const callbackURL = buildCallbackUrl(req);
      const mobileRedirect = req.query.mobile_redirect;
      if (isAllowedMobileRedirect(mobileRedirect)) {
        // Saved in the pre-auth session; read back in the callback below
        req.session.mobileRedirect = mobileRedirect;
        return req.session.save(() =>
          passport.authenticate('google', { scope: ['profile', 'email'], callbackURL } as any)(req, res, next),
        );
      }
      passport.authenticate('google', { scope: ['profile', 'email'], callbackURL } as any)(req, res, next);
    });

    app.get('/auth/google/callback',
      (req, res, next) => {
        const callbackURL = buildCallbackUrl(req);
        // Captured before login, since passport regenerates the session on success
        res.locals.mobileRedirect = req.session.mobileRedirect;
        const mobileRedirect = res.locals.mobileRedirect;
        const failureRedirect = isAllowedMobileRedirect(mobileRedirect)
          ? `${mobileRedirect}${mobileRedirect.includes("?") ? "&" : "?"}error=google`
          : '/auth';
        passport.authenticate('google', { failureRedirect, callbackURL } as any)(req, res, next);
      },
      async (req, res, next) => {
        try {
          await resolveCompanyContext(req);
          await ensurePsychologistProfile(req);
        } catch (error) {
          return next(error);
        }
        const mobileRedirect = res.locals.mobileRedirect;
        if (!isAllowedMobileRedirect(mobileRedirect)) return res.redirect('/');

        req.session.cookie.maxAge = MOBILE_SESSION_MAX_AGE;
        req.session.save(() => {
          const sep = mobileRedirect.includes("?") ? "&" : "?";
          res.redirect(`${mobileRedirect}${sep}token=${encodeURIComponent(req.sessionID)}`);
        });
      }
    );

  } else {
    // Register placeholder routes to avoid 404 when credentials are missing
    console.warn("Google OAuth credentials not provided. Google Login will be disabled.");

    app.get('/auth/google', (req, res) => {
      res.status(500).json({
        message: "Google OAuth credentials are missing. Check server logs."
      });
    });

    app.get('/auth/google/callback', (req, res) => {
      res.status(500).json({
        message: "Google OAuth credentials are missing. Check server logs."
      });
    });
  }


  // ... rest of the file ...

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Only an authenticated admin may pick role/status; public sign-up is always a psychologist
      // and joins no company until invited
      const isAdminCaller = req.isAuthenticated() && req.user.role === "admin" && !!req.companyId;
      const role = isAdminCaller && req.body.role ? req.body.role : "psychologist";
      const status = isAdminCaller && req.body.status ? req.body.status : "active";

      // Create the user
      let user = await storage.createUser({
        ...req.body,
        role,
        status,
        password: hashedPassword,
      });

      if (isAdminCaller) await upsertMembership(user.id, req.companyId!, role);

      // If user is a psychologist, create a psychologist record too
      if (isAdminCaller && role === "psychologist" && req.body.hourlyRate) {
        await storage.createPsychologist(req.companyId!, {
          userId: user.id,
          specialization: req.body.specialization || "",
          bio: req.body.bio || "",
          hourlyRate: req.body.hourlyRate
        });
      }

      // E-mails pre-authorized by an admin get their role on first access
      user = await applyPendingInvites(user);

      // Staff creating someone else's account must keep their own session
      if (req.isAuthenticated()) {
        const { password, ...userResponse } = user;
        return res.status(201).json(userResponse);
      }

      req.login(user, async (err) => {
        if (err) return next(err);
        try {
          await resolveCompanyContext(req);
          await ensurePsychologistProfile(req);
          res.status(201).json(await userPayload(req));
        } catch (error) {
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  });

  const handleLogin = (mobile: boolean) => (req: any, res: any, next: any) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, async (loginErr: any) => {
        if (loginErr) return next(loginErr);

        let userResponse;
        try {
          await resolveCompanyContext(req);
          await ensurePsychologistProfile(req);
          userResponse = await userPayload(req);
        } catch (error) {
          return next(error);
        }

        if (!mobile) return res.status(200).json(userResponse);

        // Mobile: long-lived session, its id is returned as a Bearer token
        req.session.cookie.maxAge = MOBILE_SESSION_MAX_AGE;
        req.session.save((saveErr: any) => {
          if (saveErr) return next(saveErr);
          res.status(200).json({ user: userResponse, token: req.sessionID });
        });
      });
    })(req, res, next);
  };

  app.post("/api/login", handleLogin(false));
  app.post("/api/mobile/login", handleLogin(true));

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Drop the stored session too, so a mobile Bearer token stops working
      req.session.destroy(() => res.sendStatus(200));
    });
  });

  app.get("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      res.json(await userPayload(req));
    } catch (error) {
      next(error);
    }
  });

  // Members of the active company (role = their role there)
  app.get("/api/users", requireCompany, async (req, res) => {
    try {
      // Apenas usuários admin podem listar todos os usuários
      const role = req.user!.role;
      if (role !== 'admin' && role !== 'psychologist' && role !== 'manager') {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const users = await storage.getAllUsers(req.companyId!);

      // Remover senha de todos os usuários
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json(safeUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Check if a user has a specific permission
  app.get("/api/user/permission/:permissionName", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get all permissions for the user's role
      const rolePermissions = await storage.getRolePermissionsByRole(req.user.role);

      // Get all permission entities
      const allPermissions = await storage.getAllPermissions();

      // Find the permission ID for the requested permission name
      const permission = allPermissions.find(p => p.name === req.params.permissionName);

      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }

      // Check if the user's role has this permission
      const hasPermission = rolePermissions.some(rp => rp.permissionId === permission.id);

      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ message: "Error checking permission" });
    }
  });
}
