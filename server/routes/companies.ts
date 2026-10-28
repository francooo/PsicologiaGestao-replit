import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth-guards";
import { findCompanyAccess, listUserCompanies, resolveCompanyContext, userPayload } from "../lib/companies";
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

export default router;
