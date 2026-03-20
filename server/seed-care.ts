import { db } from "./db";
import { careTemplates, careTemplateQuestions } from "@shared/patient-schema";
import { sql } from "drizzle-orm";

export async function seedCareTemplates(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(careTemplates);

    if (Number(count) > 0) return;

    const [template] = await db
      .insert(careTemplates)
      .values({
        psychologistId: null,
        title: "Check-in Semanal",
        description: "Formulário padrão de acompanhamento semanal do paciente.",
        isDefault: true,
      })
      .returning();

    await db.insert(careTemplateQuestions).values([
      {
        templateId: template.id,
        questionText: "Como está sua semana, {patient_name}?",
        questionType: "textarea",
        isRequired: true,
        orderIndex: 0,
      },
      {
        templateId: template.id,
        questionText: "Em uma escala de 1 a 10, como você avalia seu bem-estar hoje?",
        questionType: "scale",
        isRequired: true,
        orderIndex: 1,
      },
      {
        templateId: template.id,
        questionText: "Há algo que gostaria de compartilhar antes da nossa próxima sessão?",
        questionType: "textarea",
        isRequired: false,
        orderIndex: 2,
      },
    ]);

    console.log("Seeded default care template: Check-in Semanal");
  } catch (e) {
    console.error("Failed to seed care templates:", e);
  }
}
