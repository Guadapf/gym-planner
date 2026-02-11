import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, Vibration, View as RNView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { HistorialEntrenamiento, Rutina } from '../models/types';
import { StorageService } from '../storage/storageService';
import { v4 as uuidv4 } from 'uuid';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

type Props = NativeStackScreenProps<RootStackParamList, 'Entrenamiento'>;

export const EntrenamientoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rutinaId, indiceRutina } = route.params;
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicioIndex, setEjercicioIndex] = useState(0);
  const [serieActual, setSerieActual] = useState(1);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);
  const [historial, setHistorial] = useState<HistorialEntrenamiento[]>([]);
  const [mostrarMeme, setMostrarMeme] = useState(false);
  const [memeSource, setMemeSource] = useState<
    | ReturnType<typeof require>
    | null
  >(null);

  const pulse = useSharedValue(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const memeSources = [
    require('../../assets/memes/meme-1.png'),
    require('../../assets/memes/meme-2.png'),
    require('../../assets/memes/meme-3.png'),
    require('../../assets/memes/meme-4.png'),
  ];

  useEffect(() => {
    (async () => {
      const [rutinas, hist] = await Promise.all([
        StorageService.getRutinas(),
        StorageService.getHistorial(),
      ]);
      const r = rutinas.find((x) => x.id === rutinaId) ?? null;
      setRutina(r);
      setHistorial(hist);
    })();
  }, [rutinaId]);

  const ejercicioActual = useMemo(
    () => (rutina ? rutina.ejercicios[ejercicioIndex] : null),
    [rutina, ejercicioIndex],
  );

  useEffect(() => {
    if (descansoRestante === null) return;
    if (descansoRestante <= 0) {
      setDescansoRestante(null);
      pulse.value = 0;
      pulse.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) }),
      );
      Vibration.vibrate(150);
      return;
    }
    intervalRef.current && clearTimeout(intervalRef.current);
    intervalRef.current = setTimeout(() => {
      setDescansoRestante((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      intervalRef.current && clearTimeout(intervalRef.current);
    };
  }, [descansoRestante, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: 1 + pulse.value * 0.18,
      },
    ],
    opacity: 0.6 + pulse.value * 0.4,
  }));

  const handleCompletarSerie = () => {
    if (!ejercicioActual) return;
    if (descansoRestante !== null) {
      // Bloqueamos completar serie mientras hay descanso activo
      return;
    }
    if (serieActual < ejercicioActual.series) {
      setSerieActual(serieActual + 1);
      if (ejercicioActual.descansoEntreSeries > 0) {
        setDescansoRestante(ejercicioActual.descansoEntreSeries);
      }
    } else {
      if (ejercicioIndex < (rutina?.ejercicios.length ?? 0) - 1) {
        setEjercicioIndex(ejercicioIndex + 1);
        setSerieActual(1);
        const siguiente = rutina?.ejercicios[ejercicioIndex + 1];
        if (siguiente && siguiente.descansoEntreSeries > 0) {
          setDescansoRestante(siguiente.descansoEntreSeries);
        } else {
          setDescansoRestante(null);
        }
      } else {
        finalizarEntrenamiento();
      }
    }
  };

  const finalizarEntrenamiento = async () => {
    if (!rutina) {
      navigation.goBack();
      return;
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const entrada: HistorialEntrenamiento = {
      id: uuidv4(),
      fecha,
      rutinaId: rutina.id,
      rutinaNombre: rutina.nombre,
      indiceRutina,
    };
    const updated = [...historial, entrada];
    setHistorial(updated);
    await StorageService.saveHistorial(updated);
    const randomIndex = Math.floor(Math.random() * memeSources.length);
    setMemeSource(memeSources[randomIndex]);
    setMostrarMeme(true);
  };
  
  if (mostrarMeme && memeSource) {
    return (
      <ScreenContainer>
        <RNView style={styles.memeContainer}>
          <Text style={styles.memeTitle}>¡Entrenamiento completo!</Text>
          <Text style={styles.memeSubtitle}>Lo hiciste genial crack 🔥</Text>
          <Image source={memeSource} style={styles.memeImage} resizeMode="contain" />
          <RNView style={styles.memeActions}>
            <PrimaryButton
              label="Volver al inicio"
              onPress={() => {
                setMostrarMeme(false);
                navigation.goBack();
              }}
            />
          </RNView>
        </RNView>
      </ScreenContainer>
    );
  }

  if (!rutina || !ejercicioActual) {
    return (
      <ScreenContainer>
        <RNView style={styles.center}>
          <Text>Cargando entrenamiento...</Text>
        </RNView>
      </ScreenContainer>
    );
  }

  const totalEjercicios = rutina.ejercicios.length;

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <RNView style={styles.headerSection}>
          <Text style={styles.title}>
            {rutina.nombre} – {ejercicioActual.nombre}
          </Text>
          
        </RNView>

        <RNView style={styles.card}>
          {descansoRestante !== null ? (
            <RNView style={styles.restContainer}>
              <Text style={styles.restLabel}>Descanso entre series</Text>
              <Animated.View style={[styles.restBubble, pulseStyle]}>
                <Text style={styles.restTime}>{descansoRestante}s</Text>
              </Animated.View>
            </RNView>
          ) : (
            <RNView style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>
                {ejercicioActual.series} x {ejercicioActual.repeticiones} · Serie {serieActual} de {ejercicioActual.series}
              </Text>
              <Text style={styles.ready}>Listo para la siguiente serie 💪</Text>
            </RNView>
          )}
        </RNView>

        <RNView style={styles.actions}>
          <PrimaryButton
            label={descansoRestante !== null ? 'En descanso...' : 'Completar serie'}
            onPress={handleCompletarSerie}
            disabled={descansoRestante !== null}
          />
          <TouchableOpacity onPress={finalizarEntrenamiento}>
            <Text style={styles.skip}>Terminar entrenamiento</Text>
          </TouchableOpacity>
        </RNView>
      </RNView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 30,
    fontWeight: '500',
    color: colors.textMuted,
  },
  subtitleContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  restLabel: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  restBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141a2b',
  },
  restTime: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  ready: {
    paddingVertical: spacing.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  skip: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 14,
  },
  memeContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  memeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  memeSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  memeImage: {
    width: '100%',
    maxHeight: '60%',
    borderRadius: 16,
  },
  memeActions: {
    width: '100%',
  },
});

