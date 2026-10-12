import { StyleSheet, Switch, View } from 'react-native';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { questionTypes } from '@/utils/patient';
import { colors, radius } from '@/theme/tokens';
import type { CareQuestion, QuestionType } from '@/types/patient';

export type DraftQuestion = CareQuestion & { key: string; optionsText: string };

let seq = 0;
export function newQuestion(partial?: Partial<CareQuestion>): DraftQuestion {
  return {
    key: `q${Date.now()}_${seq++}`,
    questionText: partial?.questionText ?? '',
    questionType: (partial?.questionType as QuestionType) ?? 'text',
    options: partial?.options ?? null,
    isRequired: partial?.isRequired ?? true,
    orderIndex: partial?.orderIndex ?? 0,
    optionsText: (partial?.options ?? []).join('\n'),
  };
}

/** Payload format the API expects for questions. */
export function toPayload(questions: DraftQuestion[]): CareQuestion[] {
  return questions.map((q, i) => ({
    questionText: q.questionText.trim(),
    questionType: q.questionType,
    options:
      q.questionType === 'multiple_choice'
        ? q.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : null,
    isRequired: q.isRequired,
    orderIndex: i,
  }));
}

/** Editable question list (web QuestionEditor + dnd-kit reorder → up/down buttons). */
export function QuestionList({ value, onChange }: { value: DraftQuestion[]; onChange: (q: DraftQuestion[]) => void }) {
  const update = (key: string, patch: Partial<DraftQuestion>) =>
    onChange(value.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <View style={{ gap: 12 }}>
      {value.map((q, i) => (
        <View key={q.key} style={styles.item}>
          <View style={styles.itemHead}>
            <AppText variant="label" tone="muted" style={{ flex: 1 }}>
              Pergunta {i + 1}
            </AppText>
            {i > 0 && <IconButton icon={ArrowUp} size={18} label="Mover para cima" onPress={() => move(i, -1)} />}
            {i < value.length - 1 && <IconButton icon={ArrowDown} size={18} label="Mover para baixo" onPress={() => move(i, 1)} />}
            <IconButton
              icon={Trash2}
              size={18}
              tone="danger"
              label="Remover pergunta"
              onPress={() => onChange(value.filter((x) => x.key !== q.key))}
            />
          </View>
          <TextField
            placeholder="Texto da pergunta"
            value={q.questionText}
            onChangeText={(t) => update(q.key, { questionText: t })}
            multiline
          />
          <SelectField
            value={q.questionType}
            options={questionTypes}
            onChange={(v) => update(q.key, { questionType: v })}
          />
          {q.questionType === 'multiple_choice' && (
            <TextField
              label="Opções (uma por linha)"
              multiline
              placeholder={'Sim\nNão\nÀs vezes'}
              value={q.optionsText}
              onChangeText={(t) => update(q.key, { optionsText: t })}
            />
          )}
          <View style={styles.switchRow}>
            <AppText variant="label">Obrigatória</AppText>
            <Switch
              value={q.isRequired}
              onValueChange={(v) => update(q.key, { isRequired: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </View>
      ))}
      <Button
        title="Adicionar pergunta"
        variant="outline"
        icon={<Plus size={18} color={colors.ink} />}
        onPress={() => onChange([...value, newQuestion()])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  itemHead: { flexDirection: 'row', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
