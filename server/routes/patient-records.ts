import { Router } from 'express';
import { storage } from '../storage';
import { insertPatientSchema, insertMedicalRecordSchema, insertClinicalSessionSchema, insertPatientDocumentSchema, insertPsychologicalAssessmentSchema } from '@shared/schema';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for document uploads
const documentsDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, documentsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage: documentStorage,
    limits: {
        fileSize: 1024 * 1024 * 10, // 10MB max file size
    },
    fileFilter: function (req, file, cb) {
        // Check forbidden extensions (executables, scripts)
        const forbidden = /exe|sh|bat|js|php|pl|py/;
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        if (forbidden.test(ext)) {
            return cb(new Error("Tipo de arquivo não permitido por segurança."));
        }
        cb(null, true);
    },
});

// Middleware to check authentication
const checkAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
    }
    next();
};

router.use(checkAuth);

// ========== PATIENTS ROUTES ==========

// List all patients
router.get('/', async (req, res) => {
    try {
        const activeOnly = req.query.active !== 'false';
        const patients = await storage.listPatients(activeOnly);
        res.json(patients);
    } catch (error) {
        console.error("Error listing patients:", error);
        res.status(500).json({ message: "Erro ao listar pacientes" });
    }
});

// Get patient details
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const patient = await storage.getPatient(id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar paciente" });
    }
});

// Create new patient
router.post('/', async (req, res) => {
    try {
        const data = insertPatientSchema.parse(req.body);
        // Add createdBy from current user
        const userId = (req.user as any).id;
        const patientData = { ...data, createdBy: userId };
        const patient = await storage.createPatient(patientData);

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "create",
            resourceType: "patient",
            resourceId: patient.id,
            patientId: patient.id,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { name: patient.fullName }
        });

        res.status(201).json(patient);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Erro ao criar paciente" });
    }
});

// Update patient
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = (req.user as any).id;
        const data = insertPatientSchema.partial().parse(req.body);
        const patient = await storage.updatePatient(id, data);

        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "update",
            resourceType: "patient",
            resourceId: patient.id,
            patientId: patient.id,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { changes: Object.keys(data) }
        });

        res.json(patient);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Erro ao atualizar paciente" });
    }
});

// ========== MEDICAL RECORD (ANAMNESE) ROUTES ==========

router.get('/:id/medical-record', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const userId = (req.user as any).id;
        const record = await storage.getMedicalRecordByPatientId(patientId);

        // Audit log (view)
        await storage.createAuditLog({
            userId: userId,
            action: "view",
            resourceType: "medical_record",
            resourceId: record?.id || 0,
            patientId: patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { found: !!record }
        });

        res.json(record || null);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar prontuário" });
    }
});

router.post('/:id/medical-record', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const userId = (req.user as any).id;

        // Check if exists
        const existing = await storage.getMedicalRecordByPatientId(patientId);

        const data = insertMedicalRecordSchema.parse({ ...req.body, patientId });

        let record;
        if (existing) {
            record = await storage.updateMedicalRecord(existing.id, data);
        } else {
            record = await storage.createMedicalRecord(data);
        }

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: existing ? "update" : "create",
            resourceType: "medical_record",
            resourceId: record!.id,
            patientId: patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { method: existing ? "update" : "create" }
        });

        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao salvar prontuário" });
    }
});

// ========== CLINICAL SESSIONS ROUTES ==========

router.get('/:id/sessions', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const sessions = await storage.listSessionsByPatientId(patientId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Erro ao listar sessões" });
    }
});

router.post('/:id/sessions', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const userId = (req.user as any).id;
        // Ensure patientId matches URL
        const data = insertClinicalSessionSchema.parse({ ...req.body, patientId });

        const session = await storage.createSession(data);

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "create",
            resourceType: "clinical_session",
            resourceId: session.id,
            patientId: patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { date: session.sessionDate }
        });

        res.status(201).json(session);
    } catch (error) {
        console.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors });
        }
        res.status(500).json({ message: "Erro ao criar sessão" });
    }
});

router.put('/sessions/:sessionId', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const userId = (req.user as any).id;
        const data = insertClinicalSessionSchema.partial().parse(req.body);

        const oldSession = await storage.getSession(sessionId);
        if (!oldSession) return res.status(404).json({ message: "Sessão não encontrada" });

        // Ensure user has permission (is editor or admin) - to handle in permissions logic
        // For now, allow any authenticated psychologist

        // Add current user as editedBy
        const updateData = { ...data, editedBy: userId, version: (oldSession.version || 1) + 1 };

        const session = await storage.updateSession(sessionId, updateData);

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "update",
            resourceType: "clinical_session",
            resourceId: session!.id,
            patientId: session!.patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { version: session!.version }
        });

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar sessão" });
    }
});

// ========== DOCUMENTS ROUTES ==========

router.get('/:id/documents', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const docs = await storage.listDocumentsByPatientId(patientId);
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: "Erro ao listar documentos" });
    }
});

router.post('/:id/documents', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Nenhum arquivo enviado" });
        }

        const patientId = parseInt(req.params.id);
        const userId = (req.user as any).id;
        const { documentType, documentName } = req.body;

        const docData = {
            patientId,
            documentType: documentType || 'other',
            documentName: documentName || req.file.originalname,
            filePath: `/uploads/documents/${req.file.filename}`,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: userId
        };

        const doc = await storage.createDocument(docData);

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "upload",
            resourceType: "document",
            resourceId: doc.id,
            patientId: patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { filename: doc.documentName }
        });

        res.status(201).json(doc);
    } catch (error) {
        console.error("Document upload error:", error);
        res.status(500).json({ message: "Erro ao fazer upload do documento" });
    }
});

router.get('/documents/:docId/download', async (req, res) => {
    try {
        const docId = parseInt(req.params.docId);
        const userId = (req.user as any).id;
        const doc = await storage.getDocument(docId);

        if (!doc) return res.status(404).json({ message: "Documento não encontrado" });

        // Validate permission (check if user has access to patient)

        const filePath = path.join(process.cwd(), "uploads", "documents", path.basename(doc.filePath));

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Arquivo físico não encontrado" });
        }

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "download",
            resourceType: "document",
            resourceId: docId,
            patientId: doc.patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { filename: doc.documentName }
        });

        res.download(filePath, doc.documentName);

    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Erro ao baixar documento" });
    }
});

router.delete('/documents/:docId', async (req, res) => {
    try {
        const docId = parseInt(req.params.docId);
        const userId = (req.user as any).id;
        const doc = await storage.getDocument(docId);

        if (!doc) return res.status(404).json({ message: "Documento não encontrado" });

        // Optionally delete file from disk
        // const fullPath = path.join(process.cwd(), doc.filePath);
        // if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        await storage.deleteDocument(docId);

        // Audit log
        await storage.createAuditLog({
            userId: userId,
            action: "delete",
            resourceType: "document",
            resourceId: docId,
            patientId: doc.patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { filename: doc.documentName }
        });

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: "Erro ao excluir documento" });
    }
});

// ========== AUDIT LOGS ==========

router.get('/:id/audit-logs', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        // Only admin or responsible psychologist should see this?
        const logs = await storage.listAuditLogsByPatientId(patientId);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
    }
});

export default router;
