import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Image, ScrollView, StyleSheet, TouchableOpacity, Vibration, View as RNView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ejercicio, EntrenamientoEnProgreso, HistorialEntrenamiento, Rutina, SubEjercicio } from '../models/types';
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
  const [subEjercicioIndex, setSubEjercicioIndex] = useState(0); // For supersets
  const [serieActual, setSerieActual] = useState(1);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);

  // State to track if we have loaded/checked progress to avoid overwriting with initial state
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Load Progress Logic
  useEffect(() => {
    const checkProgress = async () => {
      const saved = await StorageService.getProgreso();
      const today = getToday();

      if (saved) {
        if (saved.fecha !== today) {
          // Old progress, discard silent
          await StorageService.clearProgreso();
          setIsInitialized(true);
        } else {
          // Progress from today exists
          Alert.alert(
            'Entrenamiento en curso',
            'Tenés un entrenamiento sin terminar de hoy. ¿Querés continuarlo?',
            [
              {
                text: 'Descartar',
                style: 'destructive',
                onPress: async () => {
                  await StorageService.clearProgreso();
                  setIsInitialized(true);
                },
              },
              {
                text: 'Reanudar',
                onPress: () => {
                  // Verify rutinaId matches if we want to be strict, but for now assuming user wants to resume whatever was active
                  if (saved.rutinaId !== rutinaId) {
                    // Warn mismatch? Or just resume? 
                    // If mismatch, maybe better to discard to avoid confusion, or load that other routine?
                    // Simpler: Just resume state locally if routine matches, else discard.
                    // Actually user requirement: "Solo puede existir un entrenamiento activo por día".
                    // So if I am here, I should resume. But if I opened the WRONG routine screen?
                    // The logic in HomeScreen determines routine. So likely it matches.
                  }

                  setEjercicioIndex(saved.ejercicioIndex);
                  setSerieActual(saved.serieActual);
                  setSubEjercicioIndex(saved.subEjercicioIndex);
                  setPhase('active');
                  setIsInitialized(true);
                },
              },
            ]
          );
        }
      } else {
        setIsInitialized(true);
      }
    };

    checkProgress();
  }, [rutinaId]);

  // Save Progress Logic
  useEffect(() => {
    if (!isInitialized || !rutina || phase !== 'active') return;

    const saveState = async () => {
      const progreso: EntrenamientoEnProgreso = {
        rutinaId: rutina.id,
        fecha: getToday(),
        ejercicioIndex,
        serieActual,
        subEjercicioIndex,
        timestamp: Date.now(),
      };
      await StorageService.saveProgreso(progreso);
    };

    saveState();
  }, [isInitialized, rutina, phase, ejercicioIndex, serieActual, subEjercicioIndex]);

  const ejercicioActual = useMemo(
    () => (rutina ? rutina.ejercicios[ejercicioIndex] : null),
    [rutina, ejercicioIndex],
  );

  // Determine the actual "actionable" exercise (simple or sub-exercise)
  const activeDescriptor = useMemo(() => {
    if (!ejercicioActual) return null;
    if (ejercicioActual.tipo === 'superset') {
      return ejercicioActual.ejercicios?.[subEjercicioIndex] || null;
    }
    return ejercicioActual;
  }, [ejercicioActual, subEjercicioIndex]);

  const getTargetValue = (val: number | number[] | undefined, serie: number): number => {
    if (val === undefined) return 0;
    if (Array.isArray(val)) {
      return val[serie - 1] ?? val[val.length - 1] ?? 0;
    }
    return val;
  };

  const proximoEjercicio = useMemo(
    () => (rutina && ejercicioIndex < rutina.ejercicios.length - 1 ? rutina.ejercicios[ejercicioIndex + 1] : null),
    [rutina, ejercicioIndex]
  );

  // Timer de descanso
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

  // Timer de ejercicio activo
  useEffect(() => {
    if (!enEjercicio || tiempoActivo === null) return;

    if (tiempoActivo <= 0) {
      setEnEjercicio(false);
      setTiempoActivo(null);
      Vibration.vibrate(500);
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
    if (activeDescriptor?.tipo === 'tiempo') {
      const dur = getTargetValue(activeDescriptor.duracionSegundos, serieActual);
      if (dur > 0) {
        setTiempoActivo(dur);
        setEnEjercicio(true);
      } else {
        completeSerieLogic(); // Skip if 0
      }
    }
  };

  const completeSerieLogic = () => {
    if (!ejercicioActual) return;

    if (ejercicioActual.tipo === 'superset') {
      const subs = ejercicioActual.ejercicios || [];
      if (subEjercicioIndex < subs.length - 1) {
        // Move to next sub immediately
        setSubEjercicioIndex(subEjercicioIndex + 1);
      } else {
        // End of round
        finishRound(ejercicioActual);
      }
    } else {
      finishRound(ejercicioActual);
    }
  };

  const finishRound = (ex: Ejercicio) => {
    if (serieActual < ex.series) {
      setSerieActual(serieActual + 1);
      setSubEjercicioIndex(0); // Reset for superset
      if (ex.descansoEntreSeries > 0) {
        setDescansoRestante(ex.descansoEntreSeries);
      }
    } else {
      // Finished exercise
      setPhase('summary');
    }
  };

  const handleCompletarSerie = () => {
    if (!activeDescriptor) return;
    if (descansoRestante !== null) return;

    if (activeDescriptor.tipo === 'tiempo') {
      if (!enEjercicio) {
        startSeriesTime();
      } else {
        // Skip
        setEnEjercicio(false);
        setTiempoActivo(null);
        completeSerieLogic();
      }
    } else {
      completeSerieLogic();
    }
  };

  const avanzarSiguienteEjercicio = () => {
    if (ejercicioIndex < (rutina?.ejercicios.length ?? 0) - 1) {
      setEjercicioIndex(ejercicioIndex + 1);
      setSerieActual(1);
      setSubEjercicioIndex(0);
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

    await Promise.all([
      StorageService.saveHistorial(updated),
      StorageService.clearProgreso()
    ]);

    const randomIndex = Math.floor(Math.random() * memeSources.length);
    setMemeSource(memeSources[randomIndex]);
    setPhase('finished');
  };

  const renderPreviewItem = (ex: Ejercicio, idx: number) => {
    if (ex.tipo === 'superset') {
      return (
        <RNView key={ex.id} style={styles.previewCard}>
          <RNView style={styles.previewIndexCircle}>
            <Text style={styles.previewIndexText}>{idx + 1}</Text>
          </RNView>
          <RNView style={{ flex: 1 }}>
            <Text style={[styles.previewCardTitle, { color: colors.primary }]}>SUPERSET</Text>
            <Text style={styles.previewCardDetails}>{ex.series} series (compartidas)</Text>
            {ex.ejercicios?.map((sub, i) => (
              <RNView key={sub.id} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 5 }}>•</Text>
                <Text style={{ color: colors.text, fontSize: 14 }}>{sub.nombre}</Text>
              </RNView>
            ))}
          </RNView>
        </RNView>
      );
    }

    const target = ex.tipo === 'tiempo'
      ? `${ex.series} x ${Array.isArray(ex.duracionSegundos) ? 'Var' : ex.duracionSegundos}s`
      : `${ex.series} x ${Array.isArray(ex.repeticiones) ? 'Var' : ex.repeticiones} reps`;

    return (
      <RNView key={ex.id} style={styles.previewCard}>
        <RNView style={styles.previewIndexCircle}>
          <Text style={styles.previewIndexText}>{idx + 1}</Text>
        </RNView>
        <RNView>
          <Text style={styles.previewCardTitle}>{ex.nombre}</Text>
          <Text style={styles.previewCardDetails}>{target}</Text>
        </RNView>
      </RNView>
    );
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
            {rutina.ejercicios.map(renderPreviewItem)}
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
            {completed.map((ex) => (
              <RNView key={ex.id} style={[styles.previewCard, styles.cardCompleted]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <RNView>
                  <Text style={[styles.previewCardTitle, { textDecorationLine: 'line-through', opacity: 0.7 }]}>
                    {ex.nombre || (ex.tipo === 'superset' ? 'Superset' : '')}
                  </Text>
                  {ex.tipo === 'superset' && (
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      {ex.ejercicios?.map(s => s.nombre).join(' + ')}
                    </Text>
                  )}
                </RNView>
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
                    <RNView>
                      <Text style={styles.previewCardTitle}>{ex.nombre || (ex.tipo === 'superset' ? 'Superset' : '')}</Text>
                      {ex.tipo === 'superset' && (
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          {ex.ejercicios?.map(s => s.nombre).join(' + ')}
                        </Text>
                      )}
                    </RNView>
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
  if (!activeDescriptor || !ejercicioActual) return null;

  const esTiempo = activeDescriptor.tipo === 'tiempo';
  const mostrarBotonCompletar = !esTiempo || (esTiempo && !enEjercicio);

  const textoBoton = esTiempo
    ? (enEjercicio ? 'En curso...' : 'Iniciar Tiempo')
    : (ejercicioActual.tipo === 'superset' && subEjercicioIndex < (ejercicioActual.ejercicios?.length || 0) - 1)
      ? 'Siguiente Ejercicio'
      : 'Completar serie';

  const targetValue = esTiempo
    ? getTargetValue(activeDescriptor.duracionSegundos, serieActual)
    : getTargetValue(activeDescriptor.repeticiones, serieActual);

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <RNView style={styles.headerSection}>
          <Text style={styles.title}>{rutina.nombre}</Text>
          {ejercicioActual.tipo === 'superset' && (
            <Text style={styles.supersetTag}>SUPERSET ({subEjercicioIndex + 1}/{ejercicioActual.ejercicios?.length})</Text>
          )}
          <Text style={styles.activeExerciseTitle}>{activeDescriptor.nombre}</Text>
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
                  ? `Objetivo: ${targetValue} segundos`
                  : `${targetValue} Repeticiones`
                }
              </Text>

              {esTiempo && enEjercicio && (
                <RNView style={styles.timerLargeContainer}>
                  <Text style={styles.timerLargeText}>{tiempoActivo}s</Text>
                </RNView>
              )}

              {/* Next Exercise Indicator on last set */}
              {serieActual === ejercicioActual.series && proximoEjercicio && !enEjercicio && (
                <RNView style={styles.nextExerciseContainer}>
                  <Text style={styles.nextLabel}>Próximo:</Text>
                  <Text style={styles.nextValue}>{proximoEjercicio.nombre || 'Superset'}</Text>
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
  supersetTag: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
    letterSpacing: 1,
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

