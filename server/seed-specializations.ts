import { db } from "./db";
import { specializationAreas } from "@shared/schema";
import { sql } from "drizzle-orm";

const PREDEFINED_AREAS: { name: string; category: string }[] = [
  { name: "Ansiedade", category: "Transtornos Clínicos" },
  { name: "Depressão", category: "Transtornos Clínicos" },
  { name: "Burnout e Estresse", category: "Transtornos Clínicos" },
  { name: "TOC", category: "Transtornos Clínicos" },
  { name: "TDAH", category: "Transtornos Clínicos" },
  { name: "Trauma e TEPT", category: "Transtornos Clínicos" },
  { name: "Transtornos Alimentares", category: "Transtornos Clínicos" },
  { name: "Dependência Química", category: "Transtornos Clínicos" },
  { name: "Transtorno Bipolar", category: "Transtornos Clínicos" },
  { name: "Esquizofrenia e Psicose", category: "Transtornos Clínicos" },
  { name: "Psicologia Infantil", category: "Público-Alvo" },
  { name: "Psicologia do Adolescente", category: "Público-Alvo" },
  { name: "Psicologia do Idoso", category: "Público-Alvo" },
  { name: "Psicologia da Mulher", category: "Público-Alvo" },
  { name: "Psicologia LGBTQIA+", category: "Público-Alvo" },
  { name: "Psicologia Familiar", category: "Abordagem/Contexto" },
  { name: "Terapia de Casal", category: "Abordagem/Contexto" },
  { name: "Terapia Cognitivo-Comportamental (TCC)", category: "Abordagem/Contexto" },
  { name: "Psicanálise", category: "Abordagem/Contexto" },
  { name: "Psicologia Analítica (Jung)", category: "Abordagem/Contexto" },
  { name: "EMDR", category: "Abordagem/Contexto" },
  { name: "Mindfulness", category: "Abordagem/Contexto" },
  { name: "Psicologia Escolar", category: "Área de Atuação" },
  { name: "Psicologia Organizacional", category: "Área de Atuação" },
  { name: "Psicologia Hospitalar", category: "Área de Atuação" },
  { name: "Neuropsicologia", category: "Área de Atuação" },
  { name: "Avaliação Psicológica", category: "Área de Atuação" },
  { name: "Psicologia Forense", category: "Área de Atuação" },
  { name: "Psicologia do Esporte", category: "Área de Atuação" },
  { name: "Orientação Vocacional", category: "Área de Atuação" },
  { name: "Luto e Perdas", category: "Especialidade Temática" },
  { name: "Autismo (TEA)", category: "Especialidade Temática" },
  { name: "Violência e Abuso", category: "Especialidade Temática" },
  { name: "Saúde Sexual", category: "Especialidade Temática" },
  { name: "Fobias", category: "Especialidade Temática" },
];

export async function seedSpecializationAreas(): Promise<void> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(specializationAreas);
    if (Number(count) > 0) return;

    await db.insert(specializationAreas).values(
      PREDEFINED_AREAS.map((a) => ({ ...a, isCustom: false }))
    );
    console.log(`Seeded ${PREDEFINED_AREAS.length} specialization areas.`);
  } catch (e) {
    console.error("Failed to seed specialization areas:", e);
  }
}
