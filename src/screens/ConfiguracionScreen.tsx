import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View as RNView } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppConfig, Usuario } from '../models/types';
import { StorageService } from '../storage/storageService';

export const ConfiguracionScreen: React.FC = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [nombre, setNombre] = useState('');
  const [cantidadRutinas, setCantidadRutinas] = useState('3');

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([StorageService.getUsuario(), StorageService.getConfig()]);
      setUsuario(u);
      setConfig(c);
      if (u) setNombre(u.nombre);
      if (c) setCantidadRutinas(String(c.cantidadRutinasActivas));
    })();
  }, []);

  const handleGuardar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      Alert.alert('Nombre requerido', 'El nombre no puede estar vacío.');
      return;
    }
    const cant = parseInt(cantidadRutinas, 10);
    if (Number.isNaN(cant) || cant <= 0) {
      Alert.alert(
        'Cantidad inválida',
        'La cantidad de rutinas activas debe ser un número mayor que 0.',
      );
      return;
    }

    const nuevoUsuario: Usuario = { nombre: nombreTrim };
    const nuevaConfig: AppConfig = {
      cantidadRutinasActivas: cant,
    };
    await Promise.all([
      StorageService.saveUsuario(nuevoUsuario),
      StorageService.saveConfig(nuevaConfig),
    ]);
    setUsuario(nuevoUsuario);
    setConfig(nuevaConfig);
    Alert.alert('Listo', 'Configuración guardada.');
  };

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <Text style={styles.title}>Configuración</Text>

        <Text style={styles.label}>Nombre del usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Cantidad de rutinas activas</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 3"
          placeholderTextColor={colors.textMuted}
          value={cantidadRutinas}
          keyboardType="number-pad"
          onChangeText={setCantidadRutinas}
        />

        <RNView style={{ marginTop: spacing.md }}>
          <PrimaryButton label="Guardar cambios" onPress={handleGuardar} />
        </RNView>
      </RNView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 18,
  },
});

