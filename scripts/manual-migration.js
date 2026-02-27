import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
-- Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    birth_date DATE,
    gender TEXT,
    marital_status TEXT,
    profession TEXT,
    address TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    insurance_provider TEXT,
    legal_guardian_name TEXT,
    legal_guardian_cpf TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    photo_url TEXT,
    created_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Medical Records Table
CREATE TABLE IF NOT EXISTS public.medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.patients(id),
    chief_complaint TEXT,
    personal_history TEXT,
    family_history TEXT,
    current_medications BOOLEAN DEFAULT FALSE,
    medication_details TEXT,
    diagnosis TEXT,
    icd10_code TEXT,
    therapeutic_objectives TEXT,
    psychologist_id INTEGER REFERENCES public.psychologists(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clinical Sessions Table
CREATE TABLE IF NOT EXISTS public.clinical_sessions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.patients(id),
    psychologist_id INTEGER NOT NULL REFERENCES public.psychologists(id),
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 50,
    session_type TEXT NOT NULL DEFAULT 'in-person',
    status TEXT NOT NULL DEFAULT 'completed',
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    evolution_notes TEXT NOT NULL,
    clinical_observations TEXT,
    next_steps TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    edited_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patient Documents Table
CREATE TABLE IF NOT EXISTS public.patient_documents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.patients(id),
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Psychological Assessments Table
CREATE TABLE IF NOT EXISTS public.psychological_assessments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.patients(id),
    psychologist_id INTEGER NOT NULL REFERENCES public.psychologists(id),
    assessment_name TEXT NOT NULL,
    assessment_date DATE NOT NULL,
    results TEXT,
    file_path TEXT,
    observations TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER NOT NULL,
    patient_id INTEGER REFERENCES public.patients(id),
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session History Table
CREATE TABLE IF NOT EXISTS public.session_history (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES public.clinical_sessions(id),
    version INTEGER NOT NULL,
    evolution_notes TEXT,
    clinical_observations TEXT,
    edited_by INTEGER NOT NULL REFERENCES public.users(id),
    edited_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

async function migrate() {
    try {
        console.log('🔄 Iniciando migração das tabelas de prontuário...');
        const client = await pool.connect();

        await client.query(sql);

        console.log('✅ Tabelas criadas com sucesso!');
        client.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
