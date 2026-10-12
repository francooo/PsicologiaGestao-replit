import { Alert } from 'react-native';

/** Native confirmation dialog (replaces the web AlertDialog). */
export function confirm({
  title,
  message,
  confirmLabel = 'Confirmar',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
