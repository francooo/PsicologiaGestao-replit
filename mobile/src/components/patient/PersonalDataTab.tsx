import { View } from 'react-native';
import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoRow } from '@/components/ui/InfoRow';
import { formatDate } from '@/utils/format';
import { genderOptions, labelFor, maritalOptions } from '@/utils/patient';
import { colors } from '@/theme/tokens';
import type { PatientDetail } from '@/types/patient';

export function PersonalDataTab({
  patient: p,
  isAdmin,
  psychologistName,
}: {
  patient: PatientDetail;
  isAdmin: boolean;
  psychologistName?: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" tone="subtle">
          Última atualização: {formatDate(p.updatedAt, 'dd/MM/yyyy HH:mm')}
        </AppText>
        <Button
          title="Editar"
          size="sm"
          variant="secondary"
          fullWidth={false}
          icon={<Pencil size={16} color={colors.primary} />}
          onPress={() => router.push({ pathname: '/pacientes/[id]/editar', params: { id: String(p.id) } })}
        />
      </View>

      <Card>
        <AppText variant="overline" tone="subtle">
          Informações básicas
        </AppText>
        <InfoRow label="Nome completo" value={p.fullName} />
        <InfoRow label="CPF" value={p.cpf} />
        <InfoRow label="Data de nascimento" value={p.birthDate ? formatDate(p.birthDate.slice(0, 10)) : null} />
        <InfoRow label="Gênero" value={labelFor(genderOptions, p.gender)} />
        <InfoRow label="Estado civil" value={labelFor(maritalOptions, p.maritalStatus)} />
        <InfoRow label="Profissão" value={p.profession} last />
      </Card>

      <Card>
        <AppText variant="overline" tone="subtle">
          Contato
        </AppText>
        <InfoRow label="Telefone" value={p.phone} />
        <InfoRow label="E-mail" value={p.email} />
        <InfoRow label="Endereço" value={p.address} last />
      </Card>

      <Card>
        <AppText variant="overline" tone="subtle">
          Informações administrativas
        </AppText>
        {isAdmin && (
          <InfoRow
            label="Psicóloga responsável"
            value={p.psychologistId ? psychologistName ?? 'Carregando...' : 'Não vinculada'}
          />
        )}
        <InfoRow label="Convênio" value={p.insuranceProvider} />
        <InfoRow label="Contato de emergência" value={p.emergencyContactName} />
        <InfoRow label="Telefone de emergência" value={p.emergencyContactPhone} last={!p.legalGuardianName} />
        {!!p.legalGuardianName && (
          <>
            <InfoRow label="Responsável legal" value={p.legalGuardianName} />
            <InfoRow label="CPF do responsável" value={p.legalGuardianCpf} last />
          </>
        )}
      </Card>
    </View>
  );
}
