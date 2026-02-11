import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, GestureResponderEvent } from 'react-native';
import { Text } from './Themed';
import { colors, spacing } from './Themed';

interface PrimaryButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  disabled,
  loading,
}) => {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.label, isDisabled && styles.labelDisabled]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.card,
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});

