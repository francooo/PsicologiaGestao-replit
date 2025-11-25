// Script para conectar ao banco de dados PostgreSQL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'server', 'storage.ts');

console.log('📝 Lendo arquivo server/storage.ts...');
let content = fs.readFileSync(filePath, 'utf8');

// Mudança 1: Descomentar import do db (linha 12)
console.log('✏️  Descomentando import { db } from "./db"...');
content = content.replace(
    '// import { db } from "./db"; // Commented out for local development',
    'import { db } from "./db";'
);

// Mudança 2: Descomentar import do pool (linha 14)
console.log('✏️  Descomentando import { pool } from "./db"...');
content = content.replace(
    '// import { pool } from "./db"; // Commented out for local development',
    'import { pool } from "./db";'
);

// Mudança 3: Mudar de MemStorage para DatabaseStorage (linha 645)
console.log('✏️  Mudando de MemStorage para DatabaseStorage...');
content = content.replace(
    'export const storage = new MemStorage();',
    '// Use database storage for production\nexport const storage = new DatabaseStorage();'
);

// Salvar o arquivo
console.log('💾 Salvando alterações...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Arquivo atualizado com sucesso!');
console.log('🔄 O servidor vai reiniciar automaticamente...');
console.log('📊 Agora o sistema está conectado ao banco de dados PostgreSQL!');
