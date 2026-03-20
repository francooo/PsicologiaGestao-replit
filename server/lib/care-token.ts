import crypto from "crypto";

export function generateResponseToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 hex chars
}
