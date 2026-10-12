import { Stack } from 'expo-router';

import { InvoiceList } from '@/components/invoices/InvoiceList';

export default function MyInvoicesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Minhas notas fiscais' }} />
      <InvoiceList admin={false} />
    </>
  );
}
