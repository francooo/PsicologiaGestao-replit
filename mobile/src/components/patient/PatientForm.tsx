import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, User } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { usePsychologists } from '@/api/queries';
import { genderOptions, maritalOptions, nullifyEmpty, patientStatusOptions } from '@/utils/patient';
import type { PatientDetail } from '@/types/patient';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Informe o nome completo'),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  profession: z.string().optional(),
  phone: z.string().trim().min(1, 'Informe o telefone'),
  email: z.union([z.literal(''), z.string().trim().email('E-mail inválido')]).optional(),
  address: z.string().optional(),
  status: z.string(),
  psychologistId: z.number().nullable(),
  insuranceProvider: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  legalGuardianName: z.string().optional(),
  legalGuardianCpf: z.string().optional(),
});
export type PatientFormData = z.infer<typeof schema>;

type Props = {
  initial?: PatientDetail;
  isAdmin: boolean;
  /** Create shows the short form (as the web modal); edit shows everything. */
  mode: 'create' | 'edit';
  submitLabel: string;
  loading: boolean;
  onSubmit: (data: Record<string, unknown>) => void;
};

export function PatientForm({ initial, isAdmin, mode, submitLabel, loading, onSubmit }: Props) {
  const psychologists = usePsychologists(isAdmin);
  const { control, handleSubmit } = useForm<PatientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initial?.fullName ?? '',
      cpf: initial?.cpf ?? '',
      birthDate: initial?.birthDate?.slice(0, 10) ?? '',
      gender: initial?.gender ?? '',
      maritalStatus: initial?.maritalStatus ?? '',
      profession: initial?.profession ?? '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      address: initial?.address ?? '',
      status: initial?.status ?? 'active',
      psychologistId: initial?.psychologistId ?? null,
      insuranceProvider: initial?.insuranceProvider ?? '',
      emergencyContactName: initial?.emergencyContactName ?? '',
      emergencyContactPhone: initial?.emergencyContactPhone ?? '',
      legalGuardianName: initial?.legalGuardianName ?? '',
      legalGuardianCpf: initial?.legalGuardianCpf ?? '',
    },
  });

  const submit = handleSubmit((data) => {
    const body: Record<string, unknown> = nullifyEmpty(data);
    // Non-admins don't manage the link to the psychologist (server fills it on create)
    if (!isAdmin) delete body.psychologistId;
    onSubmit(body);
  });

  const text = (
    name: keyof PatientFormData,
    label: string,
    extra: Partial<React.ComponentProps<typeof TextField>> = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          value={(field.value as string) ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...extra}
        />
      )}
    />
  );

  const select = (name: keyof PatientFormData, label: string, options: { label: string; value: string }[]) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SelectField label={label} value={(field.value as string) || null} options={options} onChange={field.onChange} />
      )}
    />
  );

  return (
    <Screen footer={<Button title={submitLabel} onPress={submit} loading={loading} />}>
      <Card style={styles.section}>
        <AppText variant="overline" tone="subtle">
          Informações básicas
        </AppText>
        {text('fullName', 'Nome completo *', { icon: User, placeholder: 'Nome do paciente', autoCapitalize: 'words' })}
        {text('cpf', 'CPF', { placeholder: '000.000.000-00', keyboardType: 'number-pad' })}
        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <DateTimeField label="Data de nascimento" mode="date" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        {select('gender', 'Gênero', genderOptions)}
        {select('maritalStatus', 'Estado civil', maritalOptions)}
        {text('profession', 'Profissão', { placeholder: 'Ex.: Engenheiro' })}
        {mode === 'edit' && select('status', 'Status', patientStatusOptions)}
      </Card>

      <Card style={styles.section}>
        <AppText variant="overline" tone="subtle">
          Contato
        </AppText>
        {text('phone', 'Telefone *', { icon: Phone, placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' })}
        {text('email', 'E-mail', {
          icon: Mail,
          placeholder: 'email@exemplo.com',
          keyboardType: 'email-address',
          autoCapitalize: 'none',
        })}
        {text('address', 'Endereço', { placeholder: 'Rua, número, bairro, cidade, estado' })}
      </Card>

      {isAdmin && (
        <Card style={styles.section}>
          <AppText variant="overline" tone="subtle">
            Psicóloga responsável
          </AppText>
          <Controller
            control={control}
            name="psychologistId"
            render={({ field }) => (
              <SelectField
                label="Psicóloga"
                value={field.value ?? 0}
                options={[
                  { label: 'Sem vínculo', value: 0 },
                  ...(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `Psicóloga #${p.id}`, value: p.id })),
                ]}
                onChange={(v) => field.onChange(v === 0 ? null : v)}
              />
            )}
          />
        </Card>
      )}

      {mode === 'edit' && (
        <Card style={styles.section}>
          <AppText variant="overline" tone="subtle">
            Informações administrativas
          </AppText>
          {text('insuranceProvider', 'Convênio', { placeholder: 'Ex.: Unimed' })}
          {text('emergencyContactName', 'Contato de emergência')}
          {text('emergencyContactPhone', 'Telefone de emergência', { keyboardType: 'phone-pad' })}
          {text('legalGuardianName', 'Responsável legal')}
          {text('legalGuardianCpf', 'CPF do responsável', { keyboardType: 'number-pad' })}
        </Card>
      )}
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({ section: { gap: 14 } });
