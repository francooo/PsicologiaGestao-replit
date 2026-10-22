import { Baby, BookOpen, DoorOpen, Users, type LucideIcon } from "lucide-react";

/** Icon for a room chosen from its name (no DB field): infantil → Baby, estudo → BookOpen, grupo → Users. */
export function roomIcon(name?: string | null): LucideIcon {
  const n = (name ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/infant|crianc|kids/.test(n)) return Baby;
  if (/estud|leitura|biblio/.test(n)) return BookOpen;
  if (/grupo|coletiv|reuni/.test(n)) return Users;
  return DoorOpen;
}
