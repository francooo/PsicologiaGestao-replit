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

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const upload = multer({
    storage: documentStorage,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
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

// Wrapper that catches MulterError before it reaches the generic handler
function uploadSingle(fieldName: string) {
    return (req: any, res: any, next: any) => {
        upload.single(fieldName)(req, res, (err: any) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        message: `O arquivo excede o tamanho máximo permitido de ${MAX_FILE_SIZE_MB}MB.`
                    });
                }
                if (err.message) {
                    return res.status(400).json({ message: err.message });
                }
                return res.status(500).json({ message: 'Erro no upload do arquivo.' });
            }
            next();
        });
    };
}

// Middleware to check authentication
const checkAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
    }
    next();
};

router.use(checkAuth);

// ========== AUTHORIZATION MIDDLEWARE ==========

/**
 * checkPatientAccess — verifica se o usuário tem permissão para acessar o prontuário.
 *
 * Regra:
 *   admin           → sempre liberado
 *   psychologist    → liberado somente se patient.psychologist_id === seu psychologists.id
 *   outros perfis   → 403 em qualquer caso
 */
async function checkPatientAccess(req: any, res: any, next: any) {
    try {
        const user = req.user as any;
        const patientId = parseInt(req.params.id);

        if (!patientId || isNaN(patientId)) {
            return res.status(400).json({ message: "ID de paciente inválido" });
        }

        const patient = await storage.getPatient(patientId);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Admin tem acesso total
        if (user.role === 'admin') {
            req.patient = patient;
            return next();
        }

        // Psicólogo: só pode acessar pacientes da sua carteira
        if (user.role === 'psychologist') {
            const psychologist = await storage.getPsychologistByUserId(user.id);
            const psychologistId = psychologist?.id ?? -1;
            if (isPatientOwned(patient, psychologistId, user.id)) {
                req.patient = patient;
                return next();
            }
        }

        // Acesso negado — registrar no audit log
        await storage.createAuditLog({
            userId: user.id,
            action: "access_denied",
            resourceType: "patient_record",
            resourceId: patientId,
            patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: {
                reason: "unauthorized",
                role: user.role,
                psychologistIdOnPatient: patient.psychologistId,
            },
        }).catch(() => { /* não interromper a resposta por falha no log */ });

        return res.status(403).json({
            message: "Acesso negado. Você não possui permissão para visualizar este prontuário.",
            code: "FORBIDDEN",
        });
    } catch (error) {
        console.error("checkPatientAccess error:", error);
        return res.status(500).json({ message: "Erro ao verificar permissão de acesso" });
    }
}

/**
 * isPatientOwned — retorna true se o usuário (psicólogo) pode acessar o paciente.
 * Critérios de propriedade (OR):
 *   1. patient.psychologistId === psychologist.id  (vínculo explícito novo)
 *   2. patient.createdBy === userId                (criou o paciente — pacientes legados)
 */
function isPatientOwned(patient: any, psychologistId: number, userId: number): boolean {
    return patient.psychologistId === psychologistId || patient.createdBy === userId;
}

// ========== PATIENTS ROUTES ==========

// List all patients — psicólogos só vêem sua carteira
router.get('/', async (req, res) => {
    try {
        const user = req.user as any;
        const activeOnly = req.query.active !== 'false';
        let patients = await storage.listPatients(activeOnly);

        // Filtrar carteira para psicólogos
        if (user.role === 'psychologist') {
            const psychologist = await storage.getPsychologistByUserId(user.id);
            const psychologistId = psychologist?.id ?? -1;
            // Acessa se for o psicólogo vinculado OU o criador do registro
            patients = patients.filter(p => isPatientOwned(p, psychologistId, user.id));
        }
        // Outros perfis (receptionist) não devem ver a lista -- apenas admin passa sem filtro

        res.json(patients);
    } catch (error) {
        console.error("Error listing patients:", error);
        res.status(500).json({ message: "Erro ao listar pacientes" });
    }
});

// Get patient details
router.get('/:id', checkPatientAccess, async (req, res) => {
    try {
        // patient already fetched and authorized by checkPatientAccess
        res.json((req as any).patient);
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
router.put('/:id', checkPatientAccess, async (req, res) => {
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

router.get('/:id/medical-record', checkPatientAccess, async (req, res) => {
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

router.post('/:id/medical-record', checkPatientAccess, async (req, res) => {
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

// Counts for tab badges
router.get('/:id/counts', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const [sessions, documents, assessments] = await Promise.all([
            storage.listSessionsByPatientId(patientId),
            storage.listDocumentsByPatientId(patientId),
            storage.listAssessmentsByPatientId(patientId),
        ]);
        res.json({
            sessions: sessions.filter(s => s.isActive !== false).length,
            documents: documents.length,
            assessments: assessments.length,
        });
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar contagens" });
    }
});

router.get('/:id/sessions', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const sessions = await storage.listSessionsByPatientId(patientId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Erro ao listar sessões" });
    }
});

router.post('/:id/sessions', checkPatientAccess, async (req, res) => {
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

// Archive session (instead of delete)
router.patch('/sessions/:sessionId/archive', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const userId = (req.user as any).id;
        const session = await storage.getSession(sessionId);
        if (!session) return res.status(404).json({ message: "Sessão não encontrada" });

        const updated = await storage.updateSession(sessionId, { isActive: false, editedBy: userId });

        await storage.createAuditLog({
            userId,
            action: "archive",
            resourceType: "clinical_session",
            resourceId: sessionId,
            patientId: session.patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { archived: true }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Erro ao arquivar sessão" });
    }
});

// ========== DOCUMENTS ROUTES ==========

router.get('/:id/documents', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const docs = await storage.listDocumentsByPatientId(patientId);
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: "Erro ao listar documentos" });
    }
});

router.post('/:id/documents', checkPatientAccess, uploadSingle('file'), async (req, res) => {
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

// ========== ASSESSMENTS ROUTES ==========

router.get('/:id/assessments', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const assessments = await storage.listAssessmentsByPatientId(patientId);
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ message: "Erro ao listar avaliações" });
    }
});

router.post('/:id/assessments', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const userId = (req.user as any).id;
        const data = insertPsychologicalAssessmentSchema.parse({ ...req.body, patientId });
        const assessment = await storage.createAssessment(data);

        await storage.createAuditLog({
            userId,
            action: "create",
            resourceType: "assessment",
            resourceId: assessment.id,
            patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: { name: assessment.assessmentName }
        });

        res.status(201).json(assessment);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: "Erro ao criar avaliação" });
    }
});

// ========== AUDIT LOGS ==========

router.get('/:id/audit-logs', checkPatientAccess, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        // Only admin or responsible psychologist should see this?
        const logs = await storage.listAuditLogsByPatientId(patientId);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
    }
});

// ========== PATIENT TRANSFER (Admin only) ==========

router.patch('/:id/transfer', async (req, res) => {
    try {
        const user = req.user as any;

        // Somente admin pode transferir
        if (user.role !== 'admin') {
            await storage.createAuditLog({
                userId: user.id,
                action: "transfer_denied",
                resourceType: "patient_record",
                resourceId: parseInt(req.params.id),
                patientId: parseInt(req.params.id),
                ipAddress: req.ip || null,
                userAgent: req.get('user-agent') || null,
                details: { reason: "not_admin", role: user.role },
            }).catch(() => { });
            return res.status(403).json({ message: "Apenas administradores podem transferir pacientes.", code: "FORBIDDEN" });
        }

        const patientId = parseInt(req.params.id);
        const { toPsychologistId, reason } = req.body;

        if (!toPsychologistId) {
            return res.status(400).json({ message: "toPsychologistId é obrigatório." });
        }

        // Buscar paciente atual
        const patient = await storage.getPatient(patientId);
        if (!patient) return res.status(404).json({ message: "Paciente não encontrado." });

        // Validar novo psicólogo
        const targetPsychologist = await storage.getPsychologist(toPsychologistId);
        if (!targetPsychologist) {
            return res.status(400).json({ message: "Psicólogo de destino não encontrado." });
        }

        // Não transferir para o mesmo psicólogo
        if (patient.psychologistId === toPsychologistId) {
            return res.status(400).json({ message: "O paciente já está vinculado a este psicólogo." });
        }

        // Executar transferência atômica (UPDATE patients + INSERT patient_transfers)
        const result = await storage.transferPatient({
            patientId,
            fromPsychologistId: patient.psychologistId ?? null,
            toPsychologistId,
            transferredByAdminId: user.id,
            reason: reason || null,
        });

        // Audit log
        await storage.createAuditLog({
            userId: user.id,
            action: "patient_transfer",
            resourceType: "patient",
            resourceId: patientId,
            patientId,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            details: {
                fromPsychologistId: patient.psychologistId,
                toPsychologistId,
                reason: reason || null,
            },
        }).catch(() => { });

        res.json({ message: "Paciente transferido com sucesso.", transfer: result });
    } catch (error) {
        console.error("Transfer error:", error);
        res.status(500).json({ message: "Erro ao transferir paciente." });
    }
});

// ========== TRANSFER HISTORY (Admin only) ==========

router.get('/:id/transfers', async (req, res) => {
    try {
        const user = req.user as any;
        if (user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado.", code: "FORBIDDEN" });
        }
        const patientId = parseInt(req.params.id);
        const transfers = await storage.listTransfersByPatientId(patientId);
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar histórico de transferências." });
    }
});

export default router;

