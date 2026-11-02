import { Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AppText } from '@/components/ui/AppText';
import { WEB_URL } from '@/config';

const open = (path: string) => WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);

/** Links to the public Privacy Policy and Terms of Use pages (web /privacidade and /termos). */
export function LegalLinks() {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={() => open('/privacidade')}>
        <AppText variant="caption" tone="muted">
          Política de Privacidade
        </AppText>
      </Pressable>
      <AppText variant="caption" tone="subtle">
        ·
      </AppText>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={() => open('/termos')}>
        <AppText variant="caption" tone="muted">
          Termos de Uso
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
});
