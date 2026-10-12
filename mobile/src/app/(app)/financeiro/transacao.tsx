import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { expenseCategories, incomeCategories } from '@/utils/finance';
import { toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

const NEW = '__new__';

// "1.234,56" (pt-BR) or "200.00" — dots are thousand separators only when a comma is present
const parseAmount = (v: string) => parseFloat(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v);

const schema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  amount: z
    .string()
    .trim()
    .min(1, 'Valor é obrigatório')
    .refine((v) => parseAmount(v) > 0, 'Informe um valor válido maior que zero'),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z.string().trim().min(1, 'Categoria é obrigatória'),
});
type FormData = z.infer<typeof schema>;

/** New income/expense (web "Nova Receita/Despesa"). The server always sets responsibleId = logged user. */
export default function TransactionScreen() {
  const { type } = useLocalSearchParams<{ type: 'income' | 'expense' }>();
  const isIncome = type !== 'expense';
  const queryClient = useQueryClient();
  const [customCategory, setCustomCategory] = useState(false);
  const categories = (isIncome ? incomeCategories : expenseCategories).map((c) => ({ label: c, value: c }));

  const { control, handleSubmit, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', amount: '', date: toDateKey(), category: '' },
  });

  const create = useMutation({
    mutationFn: (d: FormData) =>
      api('/api/transactions', {
        method: 'POST',
        body: { ...d, amount: parseAmount(d.amount), type: isIncome ? 'income' : 'expense' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Transação criada', 'A transação foi registrada com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro', `Falha ao registrar transação: ${e.message}`),
  });

  return (
    <>
      <Stack.Screen options={{ title: isIncome ? 'Nova receita' : 'Nova despesa' }} />
      <Screen
        footer={
          <Button
            title={isIncome ? 'Salvar receita' : 'Salvar despesa'}
            variant={isIncome ? 'primary' : 'danger'}
            style={isIncome ? { backgroundColor: colors.success } : undefined}
            loading={create.isPending}
            onPress={handleSubmit((d) => create.mutate(d))}
          />
        }>
        <Card style={{ gap: 14 }}>
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField
                label="Descrição"
                placeholder={isIncome ? 'Ex.: Consulta - João da Silva' : 'Ex.: Pagamento aluguel'}
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <TextField
                label="Valor (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(t.replace(/[^0-9.,]/g, ''))}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <DateTimeField label="Data" mode="date" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="category"
            render={({ field, fieldState }) =>
              customCategory ? (
                <TextField
                  label="Nova categoria"
                  placeholder="Nome da nova categoria"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  autoFocus
                />
              ) : (
                <SelectField
                  label="Categoria"
                  placeholder="Selecione uma categoria"
                  value={field.value || null}
                  options={[...categories, { label: 'Nova categoria...', value: NEW }]}
                  onChange={(v) => {
                    if (v === NEW) {
                      setCustomCategory(true);
                      setValue('category', '');
                    } else field.onChange(v);
                  }}
                  error={fieldState.error?.message}
                />
              )
            }
          />
          {customCategory && (
            <Button title="Escolher da lista" variant="ghost" size="sm" onPress={() => setCustomCategory(false)} />
          )}
        </Card>
      </Screen>
    </>
  );
}
