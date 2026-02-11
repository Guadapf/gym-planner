import React, { useState } from 'react';
import { StyleSheet, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { StorageService } from '../storage/storageService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (nombre.trim().length === 0) {
      setError('Por favor ingresá tu nombre');
      return;
    }
    setError('');
    setLoading(true);
    await StorageService.saveUsuario({ nombre: nombre.trim() });
    setLoading(false);
    navigation.replace('Main');
  };

  const splashIcon = require('../../assets/splash-icon.png');

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Image source={splashIcon} resizeMode='contain' style={{ width: 200, height: 200, alignSelf: 'center' }}/>
        <Text style={styles.title}>¡Bienvenidx!</Text>
        <Text style={styles.subtitle}>Personalizá tu experiencia ingresando tu nombre.</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          value={nombre}
          onChangeText={setNombre}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Continuar" onPress={handleContinue} loading={loading} />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
});

