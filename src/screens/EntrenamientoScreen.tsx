import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, Vibration, View as RNView } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';
import { getToday } from '../utils/dateUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Entrenamiento'>;

type Phase = 'preview' | 'active' | 'summary' | 'finished';

export const EntrenamientoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rutinaId, indiceRutina } = route.params;
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [phase, setPhase] = useState<Phase>('preview');

  const [ejercicioIndex, setEjercicioIndex] = useState(0);
  const [serieActual, setSerieActual] = useState(1);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);

  // Para ejercicios de tiempo
  const [tiempoActivo, setTiempoActivo] = useState<number | null>(null);
  const [enEjercicio, setEnEjercicio] = useState(false);

  const [historial, setHistorial] = useState<HistorialEntrenamiento[]>([]);
  const [memeSource, setMemeSource] = useState<
    | ReturnType<typeof require>
    | null
  >(null);

  const pulse = useSharedValue(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const memeSources = [
    require('../../assets/memes/meme-1.png'),
    require('../../assets/memes/meme-2.png'),
    require('../../assets/memes/meme-3.png'),
    require('../../assets/memes/meme-4.png'),
    require('../../assets/memes/meme-5.png'),
    require('../../assets/memes/meme-6.png'),
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

  const proximoEjercicio = useMemo(
    () => (rutina && ejercicioIndex < rutina.ejercicios.length - 1 ? rutina.ejercicios[ejercicioIndex + 1] : null),
    [rutina, ejercicioIndex]
  );

  // Timer de descanso (existente)
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

  // Timer de ejercicio activo (nuevo para tipo 'tiempo')
  useEffect(() => {
    if (!enEjercicio || tiempoActivo === null) return;

    if (tiempoActivo <= 0) {
      // Tiempo completado, finalizar serie automáticamente
      setEnEjercicio(false);
      setTiempoActivo(null);
      Vibration.vibrate(500); // Vibración más larga al terminar ejercicio
      completeSerieLogic();
      return;
    }

    activeTimerRef.current = setTimeout(() => {
      setTiempoActivo(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      activeTimerRef.current && clearTimeout(activeTimerRef.current);
    }
  }, [tiempoActivo, enEjercicio]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: 1 + pulse.value * 0.18,
      },
    ],
    opacity: 0.6 + pulse.value * 0.4,
  }));

  const startSeriesTime = () => {
    if (ejercicioActual?.tipo === 'tiempo' && ejercicioActual.duracionSegundos) {
      setTiempoActivo(ejercicioActual.duracionSegundos);
      setEnEjercicio(true);
    }
  };

  const completeSerieLogic = () => {
    if (!ejercicioActual) return;

    if (serieActual < ejercicioActual.series) {
      setSerieActual(serieActual + 1);
      if (ejercicioActual.descansoEntreSeries > 0) {
        setDescansoRestante(ejercicioActual.descansoEntreSeries);
      }
    } else {
      // Fin del ejercicio
      setPhase('summary');
    }
  };

  const handleCompletarSerie = () => {
    if (!ejercicioActual) return;
    if (descansoRestante !== null) return;

    if (ejercicioActual.tipo === 'tiempo') {
      if (!enEjercicio) {
        startSeriesTime();
      } else {
        // Opción de terminar antes (skip)
        setEnEjercicio(false);
        setTiempoActivo(null);
        completeSerieLogic();
      }
    } else {
      // Repeticiones
      completeSerieLogic();
    }
  };

  const avanzarSiguienteEjercicio = () => {
    if (ejercicioIndex < (rutina?.ejercicios.length ?? 0) - 1) {
      setEjercicioIndex(ejercicioIndex + 1);
      setSerieActual(1);
      setPhase('active');
    } else {
      finalizarEntrenamiento();
    }
  };

  const finalizarEntrenamiento = async () => {
    if (!rutina) {
      navigation.goBack();
      return;
    }

    const fecha = getToday();
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
    setPhase('finished');
  };

  if (phase === 'finished' && memeSource) {
    return (
      <ScreenContainer>
        <RNView style={styles.memeContainer}>
          <Text style={styles.memeTitle}>¡Entrenamiento completo!</Text>
          <Text style={styles.memeSubtitle}>Lo hiciste genial crack 🔥</Text>
          <Image source={memeSource} style={styles.memeImage} resizeMode="contain" />
          <RNView style={styles.memeActions}>
            <PrimaryButton
              label="Volver al inicio"
              onPress={() => navigation.goBack()}
            />
          </RNView>
        </RNView>
      </ScreenContainer>
    );
  }

  if (!rutina) {
    return (
      <ScreenContainer>
        <RNView style={styles.center}>
          <Text>Cargando...</Text>
        </RNView>
      </ScreenContainer>
    );
  }

  // PREVIEW PHASE
  if (phase === 'preview') {
    return (
      <ScreenContainer>
        <RNView style={styles.container}>
          <Text style={styles.previewTitle}>Tu entrenamiento de hoy</Text>
          <Text style={styles.previewSubtitle}>{rutina.nombre}</Text>

          <ScrollView style={styles.exerciseList} contentContainerStyle={{ gap: spacing.sm }}>
            {rutina.ejercicios.map((ex, idx) => (
              <RNView key={ex.id} style={styles.previewCard}>
                <RNView style={styles.previewIndexCircle}>
                  <Text style={styles.previewIndexText}>{idx + 1}</Text>
                </RNView>
                <RNView>
                  <Text style={styles.previewCardTitle}>{ex.nombre}</Text>
                  <Text style={styles.previewCardDetails}>
                    {ex.tipo === 'tiempo'
                      ? `${ex.series} series x ${ex.duracionSegundos}s`
                      : `${ex.series} series x ${ex.repeticiones} reps`
                    }
                  </Text>
                </RNView>
              </RNView>
            ))}
          </ScrollView>

          <RNView style={styles.actions}>
            <PrimaryButton label="Comenzar entrenamiento" onPress={() => setPhase('active')} />
          </RNView>
        </RNView>
      </ScreenContainer>
    );
  }

  // EXERCISE SUMMARY PHASE
  if (phase === 'summary') {
    const completed = rutina.ejercicios.slice(0, ejercicioIndex + 1);
    const pending = rutina.ejercicios.slice(ejercicioIndex + 1);

    return (
      <ScreenContainer>
        <RNView style={styles.container}>
          <Text style={styles.summaryTitle}>¡Ejercicio completado!</Text>
          <Text style={styles.summarySubtitle}>Gran trabajo, sigue así.</Text>

          <ScrollView style={styles.exerciseList} contentContainerStyle={{ gap: spacing.sm }}>
            <Text style={styles.sectionHeader}>Completados</Text>
            {completed.map((ex, idx) => (
              <RNView key={ex.id} style={[styles.previewCard, styles.cardCompleted]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={[styles.previewCardTitle, { textDecorationLine: 'line-through', opacity: 0.7 }]}>{ex.nombre}</Text>
              </RNView>
            ))}

            {pending.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Pendientes</Text>
                {pending.map((ex, idx) => (
                  <RNView key={ex.id} style={styles.previewCard}>
                    <RNView style={[styles.previewIndexCircle, { backgroundColor: colors.border }]}>
                      <Text style={styles.previewIndexText}>{ejercicioIndex + 1 + idx + 1}</Text>
                    </RNView>
                    <Text style={styles.previewCardTitle}>{ex.nombre}</Text>
                  </RNView>
                ))}
              </>
            )}
          </ScrollView>

          <RNView style={styles.actions}>
            <PrimaryButton
              label={pending.length === 0 ? "Finalizar Rutina" : "Continuar al siguiente"}
              onPress={avanzarSiguienteEjercicio}
            />
          </RNView>
        </RNView>
      </ScreenContainer>
    );
  }

  // ACTIVE PHASE
  if (!ejercicioActual) return null;

  const esTiempo = ejercicioActual.tipo === 'tiempo';
  const mostrarBotonCompletar = !esTiempo || (esTiempo && !enEjercicio);

  const textoBoton = esTiempo
    ? (enEjercicio ? 'En curso...' : 'Iniciar Tiempo')
    : 'Completar serie';

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <RNView style={styles.headerSection}>
          <Text style={styles.title}>
            {rutina.nombre}
          </Text>
          <Text style={styles.activeExerciseTitle}>{ejercicioActual.nombre}</Text>
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
                Serie {serieActual} de {ejercicioActual.series}
              </Text>
              <Text style={styles.activeDetails}>
                {esTiempo
                  ? `Objetivo: ${ejercicioActual.duracionSegundos} segundos`
                  : `${ejercicioActual.repeticiones} Repeticiones`
                }
              </Text>

              {esTiempo && enEjercicio && (
                <RNView style={styles.timerLargeContainer}>
                  <Text style={styles.timerLargeText}>{tiempoActivo}s</Text>
                </RNView>
              )}

              {/* Next Exercise Indicator on last set */}
              {serieActual === ejercicioActual.series && proximoEjercicio && (
                <RNView style={styles.nextExerciseContainer}>
                  <Text style={styles.nextLabel}>Próximo:</Text>
                  <Text style={styles.nextValue}>{proximoEjercicio.nombre}</Text>
                </RNView>
              )}
            </RNView>
          )}
        </RNView>

        <RNView style={styles.actions}>
          <PrimaryButton
            label={descansoRestante !== null ? 'En descanso...' : textoBoton}
            onPress={handleCompletarSerie}
            disabled={descansoRestante !== null || (esTiempo && enEjercicio)}
          />
          {esTiempo && enEjercicio && (
            <TouchableOpacity onPress={() => { setEnEjercicio(false); setTiempoActivo(null); }}>
              <Text style={styles.skip}>Detener</Text>
            </TouchableOpacity>
          )}
          {!enEjercicio && (
            <TouchableOpacity onPress={finalizarEntrenamiento}>
              <Text style={styles.skip}>Terminar entrenamiento</Text>
            </TouchableOpacity>
          )}
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
    marginTop: spacing.md,
  },
  title: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeExerciseTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitleContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  activeDetails: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 250,
    justifyContent: 'center',
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
  // Preview & Summary Styles
  previewTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xl,
  },
  previewSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  exerciseList: {
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  cardCompleted: {
    backgroundColor: colors.cardElevated,
    opacity: 0.8,
  },
  previewIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIndexText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  previewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewCardDetails: {
    fontSize: 14,
    color: colors.textMuted,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xl,
    color: colors.success,
  },
  summarySubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  // Timer specific
  timerLargeContainer: {
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 100,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  timerLargeText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  nextExerciseContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  nextValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

