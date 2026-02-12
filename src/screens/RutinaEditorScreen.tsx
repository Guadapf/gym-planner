import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ejercicio, Rutina, SubEjercicio } from '../models/types';
import { StorageService } from '../storage/storageService';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'RutinaEditor'>;

type Mode = 'fixed' | 'variable';

type SubEjercicioForm = {
  id: string;
  nombre: string;
  tipo: 'repeticiones' | 'tiempo';
  mode: Mode;
  valores: string[]; // Array of strings (reps or seconds)
};

type EjercicioForm = {
  id: string;
  nombre: string;
  tipo: 'repeticiones' | 'tiempo' | 'superset';
  series: string;
  descansoEntreSeries: string;

  // Simple fields
  mode: Mode;
  valores: string[];

  // Superset fields
  ejercicios: SubEjercicioForm[];
};

export const RutinaEditorScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rutinaId } = route.params || {};
  const [nombre, setNombre] = useState('');
  const [ejercicios, setEjercicios] = useState<EjercicioForm[]>([]);

  useEffect(() => {
    if (!rutinaId) return;
    (async () => {
      const rutinas = await StorageService.getRutinas();
      const rutina = rutinas.find((r) => r.id === rutinaId);
      if (rutina) {
        setNombre(rutina.nombre);
        setEjercicios(rutina.ejercicios.map(mapEjercicioToForm));
      }
    })();
  }, [rutinaId]);

  const mapEjercicioToForm = (e: Ejercicio): EjercicioForm => {
    const isSuperset = e.tipo === 'superset';

    // Helper to extract values
    const getValores = (val?: number | number[], count?: number): string[] => {
      const c = count || e.series || 1;
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'number') return Array(c).fill(String(val));
      return Array(c).fill('');
    };

    // Helper to determine mode
    const getMode = (val?: number | number[]): Mode => {
      return Array.isArray(val) ? 'variable' : 'fixed';
    };

    if (isSuperset) {
      return {
        id: e.id,
        nombre: e.nombre,
        tipo: 'superset',
        series: String(e.series),
        descansoEntreSeries: String(e.descansoEntreSeries),
        mode: 'fixed', // Unused for superset container
        valores: [], // Unused
        ejercicios: (e.ejercicios || []).map(sub => ({
          id: sub.id,
          nombre: sub.nombre,
          tipo: sub.tipo,
          mode: getMode(sub.tipo === 'tiempo' ? sub.duracionSegundos : sub.repeticiones),
          valores: getValores(sub.tipo === 'tiempo' ? sub.duracionSegundos : sub.repeticiones, e.series),
        })),
      };
    } else {
      const values = e.tipo === 'tiempo' ? e.duracionSegundos : e.repeticiones;
      return {
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo as 'repeticiones' | 'tiempo',
        series: String(e.series),
        descansoEntreSeries: String(e.descansoEntreSeries),
        mode: getMode(values),
        valores: getValores(values, e.series),
        ejercicios: [],
      };
    }
  };

  const handleAgregarEjercicio = () => {
    const nuevo: EjercicioForm = {
      id: uuidv4(),
      nombre: 'Nuevo ejercicio',
      tipo: 'repeticiones',
      series: '3',
      descansoEntreSeries: '60',
      mode: 'fixed',
      valores: ['10', '10', '10'],
      ejercicios: [],
    };
    setEjercicios((prev) => [...prev, nuevo]);
  };

  const updateValoresLength = (current: string[], count: number): string[] => {
    if (current.length === count) return current;
    if (current.length < count) {
      const last = current[current.length - 1] || '';
      return [...current, ...Array(count - current.length).fill(last)];
    }
    return current.slice(0, count);
  };

  const handleCambiarCampo = (id: string, campo: keyof EjercicioForm, valor: any) => {
    setEjercicios((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;

        const updated = { ...e, [campo]: valor };

        if (campo === 'tipo') {
          if (valor === 'superset') {
            // Init superset with 2 sub-exercises
            updated.ejercicios = [
              { id: uuidv4(), nombre: 'Sub-ejercicio 1', tipo: 'repeticiones', mode: 'fixed', valores: ['10', '10', '10'] },
              { id: uuidv4(), nombre: 'Sub-ejercicio 2', tipo: 'repeticiones', mode: 'fixed', valores: ['10', '10', '10'] }
            ];
            // Ensure sync with series
            const s = parseInt(e.series) || 3;
            updated.ejercicios.forEach(sub => sub.valores = updateValoresLength(sub.valores, s));
          } else {
            // Reset to simple
            updated.ejercicios = [];
            const s = parseInt(e.series) || 3;
            updated.valores = Array(s).fill(valor === 'tiempo' ? '60' : '10');
            updated.mode = 'fixed';
          }
        }

        if (campo === 'series') {
          const s = parseInt(valor as string) || 0;
          if (s > 0) {
            // Resize main valores
            updated.valores = updateValoresLength(updated.valores, s);
            // Resize sub-exercises
            if (updated.ejercicios) {
              updated.ejercicios = updated.ejercicios.map(sub => ({
                ...sub,
                valores: updateValoresLength(sub.valores, s)
              }));
            }
          }
        }

        return updated;
      }),
    );
  };

  const handleCambiarValor = (id: string, index: number, text: string) => {
    setEjercicios(prev => prev.map(e => {
      if (e.id !== id) return e;
      const newVals = [...e.valores];
      newVals[index] = text;
      // If fixed, sync all? No, typical behavior is edit all if mode is fixed?
      // Let's simplified: If mode is fixed, updating one updates all, or just display one input.
      // We will display 1 input if fixed. So index 0.
      if (e.mode === 'fixed') {
        return { ...e, valores: Array(e.valores.length).fill(text) };
      }
      return { ...e, valores: newVals };
    }));
  };

  const handleToggleMode = (id: string) => {
    setEjercicios(prev => prev.map(e => {
      if (e.id !== id) return e;
      return { ...e, mode: e.mode === 'fixed' ? 'variable' : 'fixed' };
    }));
  };

  // Sub-exercise handling
  const handleCambiarSub = (parentId: string, subId: string, updates: Partial<SubEjercicioForm>) => {
    setEjercicios(prev => prev.map(parent => {
      if (parent.id !== parentId) return parent;
      return {
        ...parent,
        ejercicios: parent.ejercicios.map(sub => {
          if (sub.id !== subId) return sub;
          const updatedSub = { ...sub, ...updates };

          // Handle type change defaults
          if (updates.tipo) {
            const s = parseInt(parent.series) || 3;
            updatedSub.valores = Array(s).fill(updates.tipo === 'tiempo' ? '60' : '10');
          }

          return updatedSub;
        })
      };
    }));
  };

  const handleCambiarSubValor = (parentId: string, subId: string, index: number, text: string) => {
    setEjercicios(prev => prev.map(parent => {
      if (parent.id !== parentId) return parent;
      return {
        ...parent,
        ejercicios: parent.ejercicios.map(sub => {
          if (sub.id !== subId) return sub;
          const newVals = [...sub.valores];
          if (sub.mode === 'fixed') {
            return { ...sub, valores: Array(sub.valores.length).fill(text) };
          } else {
            newVals[index] = text;
            return { ...sub, valores: newVals };
          }
        })
      };
    }));
  };

  const handleGuardar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) return Alert.alert('Error', 'Nombre de rutina requerido');
    if (ejercicios.length === 0) return Alert.alert('Error', 'Agregá ejercicios');

    const procesados: Ejercicio[] = [];

    for (const e of ejercicios) {
      if (!e.nombre.trim()) return Alert.alert('Error', 'Nombre de ejercicio requerido');
      const series = parseInt(e.series);
      const descanso = parseInt(e.descansoEntreSeries);
      if (isNaN(series) || series < 1) return Alert.alert('Error', `Series inválidas en ${e.nombre}`);

      const parseValues = (vals: string[], mode: Mode): number | number[] => {
        const nums = vals.map(v => parseInt(v));
        if (nums.some(isNaN)) throw new Error('Valor inválido');
        if (mode === 'fixed') return nums[0];
        return nums;
      };

      try {
        if (e.tipo === 'superset') {
          const subs: SubEjercicio[] = [];
          for (const sub of e.ejercicios) {
            if (!sub.nombre.trim()) return Alert.alert('Error', 'Nombre de sub-ejercicio requerido');
            const vals = parseValues(sub.valores, sub.mode);
            const isTiempo = sub.tipo === 'tiempo';
            subs.push({
              id: sub.id,
              nombre: sub.nombre,
              tipo: sub.tipo,
              repeticiones: !isTiempo ? vals : undefined,
              duracionSegundos: isTiempo ? vals : undefined,
            });
          }

          procesados.push({
            id: e.id,
            nombre: e.nombre, // Maybe "Superset" or custom
            tipo: 'superset',
            series,
            descansoEntreSeries: descanso,
            ejercicios: subs
          });

        } else {
          const vals = parseValues(e.valores, e.mode);
          const isTiempo = e.tipo === 'tiempo';
          procesados.push({
            id: e.id,
            nombre: e.nombre,
            tipo: e.tipo,
            series,
            descansoEntreSeries: descanso,
            repeticiones: !isTiempo ? vals : undefined,
            duracionSegundos: isTiempo ? vals : undefined,
          });
        }
      } catch (err) {
        return Alert.alert('Error', `Valores numéricos inválidos en ${e.nombre}`);
      }
    }

    const rutinas = await StorageService.getRutinas();
    let updated: Rutina[];
    if (rutinaId) {
      updated = rutinas.map(r => r.id === rutinaId ? { ...r, nombre: nombreTrim, ejercicios: procesados } : r);
    } else {
      updated = [...rutinas, { id: uuidv4(), nombre: nombreTrim, ejercicios: procesados }];
    }
    await StorageService.saveRutinas(updated);
    navigation.goBack();
  };

  const renderInputs = (
    valores: string[],
    mode: Mode,
    label: string,
    onChange: (idx: number, txt: string) => void,
    onToggle: () => void
  ) => {
    return (
      <RNView>
        <RNView style={styles.inputHeader}>
          <Text style={styles.label}>{label} ({mode === 'fixed' ? 'Fijo' : 'Por serie'})</Text>
          <Switch value={mode === 'variable'} onValueChange={onToggle} style={{ transform: [{ scale: 0.7 }] }} />
        </RNView>

        {mode === 'fixed' ? (
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={valores[0]}
            onChangeText={(t) => onChange(0, t)}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variableRow}>
            {valores.map((v, idx) => (
              <RNView key={idx} style={styles.variableInputContainer}>
                <Text style={styles.miniLabel}>S{idx + 1}</Text>
                <TextInput
                  style={[styles.input, styles.miniInput]}
                  keyboardType="number-pad"
                  value={v}
                  onChangeText={(t) => onChange(idx, t)}
                />
              </RNView>
            ))}
          </ScrollView>
        )}
      </RNView>
    );
  };

  const renderItem = ({ item }: { item: EjercicioForm }) => {
    const isSuperset = item.tipo === 'superset';

    return (
      <RNView style={styles.exerciseCard}>
        <RNView style={styles.exerciseHeader}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            value={item.nombre}
            placeholder="Nombre Ejercicio"
            placeholderTextColor={colors.textMuted}
            onChangeText={(t) => handleCambiarCampo(item.id, 'nombre', t)}
          />
          <TouchableOpacity onPress={() => setEjercicios(prev => prev.filter(e => e.id !== item.id))}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </RNView>

        <RNView style={styles.typeSelector}>
          {(['repeticiones', 'tiempo', 'superset'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeButton, item.tipo === t && styles.typeButtonActive]}
              onPress={() => handleCambiarCampo(item.id, 'tipo', t)}
            >
              <Text style={[styles.typeText, item.tipo === t && styles.typeTextActive]}>
                {t === 'superset' ? 'Superset (Combo)' : t === 'tiempo' ? 'Tiempo' : 'Reps'}
              </Text>
            </TouchableOpacity>
          ))}
        </RNView>

        <RNView style={styles.row}>
          <RNView style={styles.rowField}>
            <Text style={styles.label}>Series (Compartidas)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={item.series}
              onChangeText={(t) => handleCambiarCampo(item.id, 'series', t)}
            />
          </RNView>
          <RNView style={styles.rowField}>
            <Text style={styles.label}>Descanso (seg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={item.descansoEntreSeries}
              onChangeText={(t) => handleCambiarCampo(item.id, 'descansoEntreSeries', t)}
            />
          </RNView>
        </RNView>

        {!isSuperset && (
          <RNView style={{ marginTop: spacing.sm }}>
            {renderInputs(
              item.valores,
              item.mode,
              item.tipo === 'tiempo' ? 'Segundos' : 'Repeticiones',
              (idx, t) => handleCambiarValor(item.id, idx, t),
              () => handleToggleMode(item.id)
            )}
          </RNView>
        )}

        {isSuperset && (
          <RNView style={styles.supersetContainer}>
            <Text style={styles.supersetLabel}>Ejercicios del Combo:</Text>
            {item.ejercicios.map((sub, idx) => (
              <RNView key={sub.id} style={styles.subCard}>
                <RNView style={{ flexDirection: 'row', gap: 5, marginBottom: 5 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={sub.nombre}
                    placeholder={`Ejercicio ${idx + 1}`}
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(t) => handleCambiarSub(item.id, sub.id, { nombre: t })}
                  />
                  <TouchableOpacity
                    style={[styles.miniTypeBtn, sub.tipo === 'tiempo' && styles.miniTypeBtnActive]}
                    onPress={() => handleCambiarSub(item.id, sub.id, { tipo: sub.tipo === 'repeticiones' ? 'tiempo' : 'repeticiones' })}
                  >
                    <Text style={styles.miniTypeText}>{sub.tipo === 'tiempo' ? '⏱' : '🔢'}</Text>
                  </TouchableOpacity>
                </RNView>
                {renderInputs(
                  sub.valores,
                  sub.mode,
                  sub.tipo === 'tiempo' ? 'Segundos' : 'Repeticiones',
                  (i, t) => handleCambiarSubValor(item.id, sub.id, i, t),
                  () => handleCambiarSub(item.id, sub.id, { mode: sub.mode === 'fixed' ? 'variable' : 'fixed' })
                )}
              </RNView>
            ))}
          </RNView>
        )}

      </RNView>
    );
  };

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <Text style={styles.title}>{rutinaId ? 'Editar rutina' : 'Nueva rutina'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la rutina"
          placeholderTextColor={colors.textMuted}
          value={nombre}
          onChangeText={setNombre}
        />

        <RNView style={styles.headerRow}>
          <Text style={styles.subtitle}>Ejercicios</Text>
          <TouchableOpacity onPress={handleAgregarEjercicio}>
            <Text style={styles.add}>+ Agregar</Text>
          </TouchableOpacity>
        </RNView>

        <FlatList
          data={ejercicios}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <RNView style={styles.saveButton}>
          <PrimaryButton label="Guardar Rutina" onPress={handleGuardar} />
        </RNView>
      </RNView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  add: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  exerciseCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  rowField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  typeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  variableRow: {
    flexDirection: 'row',
    gap: 5
  },
  variableInputContainer: {
    width: 60,
    marginRight: 5,
    alignItems: 'center'
  },
  miniLabel: {
    fontSize: 10,
    color: colors.textMuted
  },
  miniInput: {
    textAlign: 'center',
    padding: spacing.xs
  },
  supersetContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary
  },
  supersetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase'
  },
  subCard: {
    marginBottom: spacing.md
  },
  miniTypeBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  miniTypeBtnActive: {
    borderColor: colors.primary
  },
  miniTypeText: {
    fontSize: 16
  }
});

