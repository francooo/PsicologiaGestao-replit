# Como Conectar ao Banco de Dados PostgreSQL

## Problema Atual
O sistema está usando armazenamento em memória (`MemStorage`), o que significa que:
- Os dados são perdidos quando o servidor reinicia
- Os usuários do banco de dados PostgreSQL não estão acessíveis
- Você precisa recriar usuários toda vez que o servidor reinicia

## Solução
Mudar para `DatabaseStorage` para usar o banco de dados PostgreSQL real.

## Passos para Conectar

### 1. Abra o arquivo `server/storage.ts`

### 2. Descomente as linhas 12-14

**Encontre estas linhas (12-14):**
```typescript
// import { db } from "./db"; // Commented out for local development
import { eq, and, gte, lte, sql } from "drizzle-orm";
// import { pool } from "./db"; // Commented out for local development
```

**Mude para:**
```typescript
import { db } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { pool } from "./db";
```

### 3. Mude a linha 645

**Encontre esta linha (645):**
```typescript
export const storage = new MemStorage();
```

**Mude para:**
```typescript
export const storage = new DatabaseStorage();
```

### 4. Salve o arquivo

### 5. Reinicie o servidor

O servidor vai reiniciar automaticamente quando você salvar o arquivo.

## Resultado

Após fazer essas mudanças:
- ✅ Os dados serão persistidos no banco de dados PostgreSQL
- ✅ Os usuários existentes no banco estarão acessíveis
- ✅ Você não precisará recriar usuários após reiniciar o servidor
- ✅ Todos os dados (agendamentos, psicólogos, salas, etc.) serão salvos permanentemente

## Verificação

Para verificar se funcionou, após reiniciar o servidor, execute:
```bash
node scripts/list-users.js
```

Você deve ver os usuários que existem no banco de dados PostgreSQL.
