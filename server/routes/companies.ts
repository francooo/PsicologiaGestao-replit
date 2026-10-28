import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies } from "@shared/schema";
import { requireAdmin, requireAuth, requireCompany } from "../middleware/auth-guards";
import {
  cnpjSchema,
  companyNameSchema,
  findCompanyAccess,
  listUserCompanies,
  resolveCompanyContext,
  userPayload,
} from "../lib/companies";
import { storage } from "../storage";

// Mounted at /api/companies — the logged-in user's companies and the active one.
const router = Router();

// GET /api/companies/mine
router.get("/mine", requireAuth, async (req, res) => {
  try {
    res.json(await listUserCompanies(req.user!.id));
  } catch (error) {
    console.error("GET /api/companies/mine:", error);
    res.status(500).json({ message: "Erro ao carregar empresas." });
  }
});

const switchSchema = z.object({ companyId: z.coerce.number().int().positive() });

// POST /api/companies/switch { companyId } — returns the refreshed /api/user payload
router.post("/switch", requireAuth, async (req, res) => {
  const parsed = switchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Empresa inválida." });

  try {
    const company = await findCompanyAccess(req.user!, parsed.data.companyId);
    if (!company) return res.status(403).json({ message: "Você não tem acesso a esta empresa." });

    // Platform admin entering a company they don't belong to (support): leave a trace there
    const isMember = (await listUserCompanies(req.user!.id)).some((c) => c.id === company.id);
    if (!isMember) {
      await storage.createAuditLog(company.id, {
        userId: req.user!.id,
        action: "platform_support_access",
        resourceType: "company",
        resourceId: company.id,
        patientId: null,
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        details: { email: req.user!.email },
      });
    }

    req.session.companyId = company.id;
    await resolveCompanyContext(req);
    const payload = await userPayload(req);
    req.session.save((err) => {
      if (err) {
        console.error("POST /api/companies/switch (session):", err);
        return res.status(500).json({ message: "Erro ao trocar de empresa." });
      }
      res.json(payload);
    });
  } catch (error) {
    console.error("POST /api/companies/switch:", error);
    res.status(500).json({ message: "Erro ao trocar de empresa." });
  }
});

// ─── The active company's own data (Configurações → Dados da empresa) ─────────

const currentColumns = { id: companies.id, name: companies.name, slug: companies.slug, cnpj: companies.cnpj, logoUrl: companies.logoUrl };

// GET /api/companies/current
router.get("/current", requireCompany, async (req, res) => {
  try {
    const [company] = await db.select(currentColumns).from(companies).where(eq(companies.id, req.companyId!));
    res.json(company);
  } catch (error) {
    console.error("GET /api/companies/current:", error);
    res.status(500).json({ message: "Erro ao carregar a empresa." });
  }
});

const updateSchema = z.object({ name: companyNameSchema.optional(), cnpj: cnpjSchema.optional() });

// PATCH /api/companies/current { name?, cnpj? } — the clinic's admin edits it
router.patch("/current", requireCompany, requireAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  if (Object.keys(parsed.data).length === 0) return res.status(400).json({ message: "Nada para alterar." });

  try {
    const [company] = await db.update(companies).set(parsed.data).where(eq(companies.id, req.companyId!)).returning(currentColumns);
    res.json(company);
  } catch (error) {
    console.error("PATCH /api/companies/current:", error);
    res.status(500).json({ message: "Erro ao salvar a empresa." });
  }
});

// Logos are stored as bytea (Vercel's filesystem is ephemeral), small enough for the request limit
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/image\/(jpeg|jpg|png|webp)/.test(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas imagens JPEG, PNG ou WEBP são permitidas."));
  },
});

// POST /api/companies/current/logo (multipart "logo")
router.post(
  "/current/logo",
  requireCompany,
  requireAdmin,
  (req, res, next) => {
    logoUpload.single("logo")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Imagem muito grande. Máximo 2MB." });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada." });
    try {
      const id = req.companyId!;
      // The version in the URL makes browsers and the app drop the cached old logo
      const logoUrl = `/api/companies/${id}/logo?v=${Date.now()}`;
      const [company] = await db
        .update(companies)
        .set({ logoUrl, logoData: req.file.buffer, logoMimeType: req.file.mimetype })
        .where(eq(companies.id, id))
        .returning(currentColumns);
      res.json(company);
    } catch (error) {
      console.error("POST /api/companies/current/logo:", error);
      res.status(500).json({ message: "Erro ao salvar o logo." });
    }
  }
);

// DELETE /api/companies/current/logo
router.delete("/current/logo", requireCompany, requireAdmin, async (req, res) => {
  try {
    const [company] = await db
      .update(companies)
      .set({ logoUrl: null, logoData: null, logoMimeType: null })
      .where(eq(companies.id, req.companyId!))
      .returning(currentColumns);
    res.json(company);
  } catch (error) {
    console.error("DELETE /api/companies/current/logo:", error);
    res.status(500).json({ message: "Erro ao remover o logo." });
  }
});

// GET /api/companies/:id/logo — public: <img> tags and the patients' public pages
router.get("/:id/logo", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Empresa inválida." });
  try {
    const [row] = await db
      .select({ data: companies.logoData, mimeType: companies.logoMimeType })
      .from(companies)
      .where(eq(companies.id, id));
    if (!row?.data) return res.status(404).json({ message: "Logo não encontrado." });
    res.setHeader("Content-Type", row.mimeType || "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(row.data));
  } catch (error) {
    console.error("GET /api/companies/:id/logo:", error);
    res.status(500).json({ message: "Erro ao exibir o logo." });
  }
});

export default router;
