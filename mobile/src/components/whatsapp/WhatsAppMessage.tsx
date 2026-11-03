import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bold, Italic, Strikethrough } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { parseWhatsApp, wrapSelection, type WaNode } from '@/utils/whatsapp';
import { colors, fonts, radius } from '@/theme/tokens';

function renderNodes(nodes: WaNode[], key = 'n'): ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === 'string') return n;
    const k = `${key}-${i}`;
    const style =
      n.style === 'bold' ? styles.bold : n.style === 'italic' ? styles.italic : n.style === 'strike' ? styles.strike : styles.mono;
    return (
      <Text key={k} style={style}>
        {renderNodes(n.children, k)}
      </Text>
    );
  });
}

/** The message as the patient will see it: a WhatsApp bubble with the formatting applied. */
export function WhatsAppPreview({ text }: { text: string }) {
  return (
    <View style={styles.chat}>
      <View style={styles.bubble}>
        {text.trim() ? (
          <Text style={styles.bubbleText}>{renderNodes(parseWhatsApp(text))}</Text>
        ) : (
          <Text style={[styles.bubbleText, { color: '#667781', fontStyle: 'italic' }]}>Mensagem vazia</Text>
        )}
      </View>
    </View>
  );
}

const MARKS = [
  { mark: '*', icon: Bold, label: 'Negrito' },
  { mark: '_', icon: Italic, label: 'Itálico' },
  { mark: '~', icon: Strikethrough, label: 'Tachado' },
];

/** Message field with Negrito / Itálico / Tachado buttons that apply WhatsApp's own markers. */
export function WhatsAppEditor({ value, onChange, maxLength }: { value: string; onChange: (v: string) => void; maxLength: number }) {
  // Selection is read from the input; it is only set (once) after applying a marker, since a
  // permanently controlled selection makes the cursor jump while typing on Android
  const selection = useRef({ start: value.length, end: value.length });
  const [forced, setForced] = useState<{ start: number; end: number }>();

  const apply = (mark: string) => {
    const next = wrapSelection(value, selection.current.start, selection.current.end, mark);
    onChange(next.text);
    setForced({ start: next.start, end: next.end });
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.toolbar}>
        <AppText variant="label" style={{ flex: 1 }}>
          Mensagem
        </AppText>
        {MARKS.map(({ mark, icon: Icon, label }) => (
          <Pressable
            key={mark}
            onPress={() => apply(mark)}
            accessibilityRole="button"
            accessibilityLabel={label}
            hitSlop={4}
            style={({ pressed }) => [styles.tool, pressed && { backgroundColor: colors.surfaceMuted }]}>
            <Icon size={18} color={colors.ink} />
          </Pressable>
        ))}
      </View>
      <TextField
        multiline
        value={value}
        onChangeText={onChange}
        selection={forced}
        onSelectionChange={(e) => {
          selection.current = e.nativeEvent.selection;
          if (forced) setForced(undefined);
        }}
        error={value.length > maxLength ? `Use no máximo ${maxLength} caracteres.` : undefined}
        hint={`${value.length}/${maxLength} · selecione um trecho e toque em B, I ou S para formatar`}
        style={{ minHeight: 200, textAlignVertical: 'top' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { backgroundColor: '#EFEAE2', borderRadius: radius.md, padding: 12 },
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '94%',
    backgroundColor: '#D9FDD3',
    borderRadius: 10,
    borderTopRightRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: '#111B21' },
  bold: { fontFamily: fonts.semibold },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  mono: { fontFamily: 'monospace', fontSize: 14 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tool: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
