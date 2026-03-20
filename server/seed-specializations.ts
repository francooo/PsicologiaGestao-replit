import { db } from "./db";
import { specializationAreas } from "@shared/schema";
import { sql } from "drizzle-orm";

const PREDEFINED_AREAS: { name: string; category: string }[] = [
  // Transtornos Clínicos (10)
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

  // Público-Alvo (5)
  { name: "Psicologia Infantil", category: "Público-Alvo" },
  { name: "Psicologia do Adolescente", category: "Público-Alvo" },
  { name: "Psicologia do Idoso", category: "Público-Alvo" },
  { name: "Psicologia da Mulher", category: "Público-Alvo" },
  { name: "Psicologia LGBTQIA+", category: "Público-Alvo" },

  // Abordagem (9)
  { name: "Psicologia Familiar", category: "Abordagem" },
  { name: "Terapia de Casal", category: "Abordagem" },
  { name: "Terapia Cognitivo-Comportamental (TCC)", category: "Abordagem" },
  { name: "Psicanálise", category: "Abordagem" },
  { name: "Psicologia Analítica (Jung)", category: "Abordagem" },
  { name: "EMDR", category: "Abordagem" },
  { name: "Mindfulness", category: "Abordagem" },
  { name: "Terapia de Aceitação e Compromisso (ACT)", category: "Abordagem" },
  { name: "Gestalt-terapia", category: "Abordagem" },

  // Área de Atuação (10)
  { name: "Psicologia Escolar", category: "Área de Atuação" },
  { name: "Psicologia Organizacional", category: "Área de Atuação" },
  { name: "Psicologia Hospitalar", category: "Área de Atuação" },
  { name: "Neuropsicologia", category: "Área de Atuação" },
  { name: "Avaliação Psicológica", category: "Área de Atuação" },
  { name: "Psicologia Forense", category: "Área de Atuação" },
  { name: "Psicologia do Esporte", category: "Área de Atuação" },
  { name: "Orientação Vocacional", category: "Área de Atuação" },
  { name: "Saúde Mental no Trabalho", category: "Área de Atuação" },
  { name: "Psicologia da Saúde", category: "Área de Atuação" },

  // Especialidade (5)
  { name: "Luto e Perdas", category: "Especialidade" },
  { name: "Autismo (TEA)", category: "Especialidade" },
  { name: "Violência e Abuso", category: "Especialidade" },
  { name: "Saúde Sexual", category: "Especialidade" },
  { name: "Fobias", category: "Especialidade" },
];

export async function seedSpecializationAreas(): Promise<void> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(specializationAreas);
    if (Number(count) >= PREDEFINED_AREAS.length) return;

    for (const area of PREDEFINED_AREAS) {
      await db
        .insert(specializationAreas)
        .values({ name: area.name, category: area.category, isCustom: false })
        .onConflictDoNothing();
    }
    console.log(`Seeded ${PREDEFINED_AREAS.length} specialization areas.`);
  } catch (e) {
    console.error("Failed to seed specialization areas:", e);
  }
}
