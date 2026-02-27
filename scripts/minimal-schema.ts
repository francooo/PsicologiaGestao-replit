
import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: text("role").notNull().default("psychologist"),
    status: text("status").notNull().default("active"),
    profileImage: text("profile_image"),
});
