
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { pgTable, text, serial } from "drizzle-orm/pg-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../env.local') });

// Define schema inline
const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: text("role").notNull().default("psychologist"),
    status: text("status").notNull().default("active"),
    profileImage: text("profile_image"),
});

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function listUsers() {
    try {
        const allUsers = await db.select().from(users);
        console.log("Users found:", allUsers.length);
        console.table(allUsers.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            status: u.status
        })));
    } catch (error) {
        console.error("Error fetching users:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

listUsers();
