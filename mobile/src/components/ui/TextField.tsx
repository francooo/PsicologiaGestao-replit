import { forwardRef, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { AppText } from './AppText';
import { colors, fonts, radius } from '@/theme/tokens';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  password?: boolean;
  containerStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, hint, icon: Icon, password, containerStyle, style, multiline, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <AppText variant="label" style={styles.label}>
            {label}
          </AppText>
        )}
        <View
          style={[
            styles.field,
            multiline && styles.multiline,
            focused && styles.focused,
            !!error && styles.errorBorder,
          ]}>
          {Icon && (
            <View style={[styles.icon, multiline && { paddingTop: 14 }]}>
              <Icon size={18} color={colors.textMuted} />
            </View>
          )}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textSubtle}
            secureTextEntry={password && !visible}
            autoCapitalize={password ? 'none' : props.autoCapitalize}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            {...props}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            accessibilityLabel={props.accessibilityLabel ?? label}
            style={[styles.input, !Icon && { paddingLeft: 14 }, multiline && { minHeight: 96, paddingTop: 12 }, style]}
          />
          {password && (
            <Pressable
              onPress={() => setVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
              hitSlop={10}
              style={styles.trailing}>
              {visible ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
            </Pressable>
          )}
        </View>
        {!!error && (
          <AppText variant="caption" tone="danger" style={styles.helper}>
            {error}
          </AppText>
        )}
        {!error && !!hint && (
          <AppText variant="caption" tone="subtle" style={styles.helper}>
            {hint}
          </AppText>
        )}
      </View>
    );
  },
);
TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: colors.ink },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  multiline: { alignItems: 'flex-start' },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.danger },
  icon: { paddingLeft: 14, paddingRight: 4 },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  trailing: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },
  helper: { marginTop: 2 },
});
