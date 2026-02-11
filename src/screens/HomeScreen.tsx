import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { StorageService } from '../storage/storageService';
import { AppConfig, HistorialEntrenamiento, Rutina, Usuario } from '../models/types';
import { getToday } from '../utils/dateUtils';
import { obtenerIndiceRutinaParaHoy } from '../services/rotationService';

type Nav = NativeStackScreenProps<RootStackParamList>['navigation'];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [historial, setHistorial] = useState<HistorialEntrenamiento[]>([]);

  const cargarDatos = useCallback(async () => {
    const [u, r, c, h] = await Promise.all([
      StorageService.getUsuario(),
      StorageService.getRutinas(),
      StorageService.getConfig(),
      StorageService.getHistorial(),
    ]);
    setUsuario(u);
    setRutinas(r);
    setConfig(c);
    setHistorial(h);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos]),
  );

  const fechaHoy = getToday();

  const indiceRutina =
    config && rutinas.length > 0
      ? obtenerIndiceRutinaParaHoy(fechaHoy, rutinas, config.cantidadRutinasActivas, historial)
      : 0;

  const rutinaDeHoy = rutinas[indiceRutina];

  const handleEntrenarHoy = () => {
    if (!rutinaDeHoy) return;
    navigation.navigate('Entrenamiento', {
      rutinaId: rutinaDeHoy.id,
      indiceRutina,
    });
  };

  return (
    <ScreenContainer>
      <RNView style={styles.wrapper}>
        <RNView>
          <Text style={styles.greeting}>
            Hola{usuario?.nombre ? `, ${usuario.nombre}` : ''} 💪
          </Text>
          <Text style={styles.subtitle}>Listo para entrenar hoy?</Text>
        </RNView>

        <RNView style={styles.card}>
          <Text style={styles.cardTitle}>Rutina de hoy</Text>
          {rutinaDeHoy ? (
            <>
              <Text style={styles.routineName}>{rutinaDeHoy.nombre}</Text>
              <Text style={styles.routineMeta}>
                {rutinaDeHoy.ejercicios.length} ejercicios configurados
              </Text>
            </>
          ) : (
            <Text style={styles.routineMeta}>
              Todavía no configuraste rutinas. Creá al menos una para empezar.
            </Text>
          )}
          <RNView style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label={rutinaDeHoy ? 'Entrenar hoy' : 'Configurar rutinas'}
              onPress={
                rutinaDeHoy
                  ? handleEntrenarHoy
                  : () => navigation.navigate('Main', { screen: 'Rutinas' })
              }
            />
          </RNView>
        </RNView>
      </RNView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 35,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginTop: spacing.xxl,
  },
  subtitle: {
    marginBottom: spacing.xl,
    color: colors.textMuted,
    fontSize: 16,
  },
  card: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  routineMeta: {
    marginBottom: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
  },
});

