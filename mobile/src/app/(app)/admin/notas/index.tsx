import { Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import { CalendarCheck } from 'lucide-react-native';

import { InvoiceList } from '@/components/invoices/InvoiceList';
import { colors } from '@/theme/tokens';

export default function AdminInvoicesScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notas — todas as psicólogas',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/admin/notas/status')}
              accessibilityRole="button"
              accessibilityLabel="Status por mês"
              hitSlop={10}>
              <CalendarCheck size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <InvoiceList admin />
    </>
  );
}
