import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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

export function setupAuth(app: Express) {
  // ... existing setup ...

  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
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
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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

            // Create psychologist record for new google users so they can access the system
            await storage.createPsychologist({
              userId: user.id,
              specialization: "Psicólogo (Google Auth)",
              bio: "Bio pendente...",
              hourlyRate: 0
            });
          }

          if (user?.status !== "active") {
            return done(null, false, { message: "Account is not active." });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    ));

    // Google Auth Routes
    app.get('/auth/google', (req, res, next) => {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
        return res.status(500).json({
          message: "Google OAuth not configured. Please add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to your .env file."
        });
      }
      passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });

    app.get('/auth/google/callback',
      (req, res, next) => {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
          return res.redirect('/auth?error=configuration_missing');
        }
        passport.authenticate('google', { failureRedirect: '/auth' })(req, res, next);
      },
      (req, res) => {
        // Successful authentication, redirect dashboard.
        res.redirect('/');
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

      // Create the user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // If user is a psychologist, create a psychologist record too
      if (req.body.role === "psychologist" && req.body.hourlyRate) {
        await storage.createPsychologist({
          userId: user.id,
          specialization: req.body.specialization || "",
          bio: req.body.bio || "",
          hourlyRate: req.body.hourlyRate
        });
      }

      // Clean up sensitive info before returning
      const { password, ...userResponse } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // Clean up sensitive info before returning
        const { password, ...userResponse } = user;

        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Clean up sensitive info before returning
    const { password, ...userResponse } = req.user as any;

    res.json(userResponse);
  });

  // Rota para listar todos os usuários
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Apenas usuários admin podem listar todos os usuários
      if (req.user.role !== 'admin' && req.user.role !== 'psychologist' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const users = await storage.getAllUsers();

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
