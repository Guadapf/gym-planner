import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
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
import { Ejercicio, Rutina } from '../models/types';
import { StorageService } from '../storage/storageService';
import { v4 as uuidv4 } from 'uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'RutinaEditor'>;

type EjercicioForm = Omit<Ejercicio, 'series' | 'repeticiones' | 'duracionSegundos' | 'descansoEntreSeries'> & {
  series: string;
  repeticiones: string;
  duracionSegundos: string;
  descansoEntreSeries: string;
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
        setEjercicios(
          rutina.ejercicios.map((e) => ({
            ...e,
            series: String(e.series),
            repeticiones: e.repeticiones ? String(e.repeticiones) : '',
            duracionSegundos: e.duracionSegundos ? String(e.duracionSegundos) : '',
            descansoEntreSeries: String(e.descansoEntreSeries),
          }))
        );
      }
    })();
  }, [rutinaId]);

  const handleAgregarEjercicio = () => {
    const nuevo: EjercicioForm = {
      id: uuidv4(),
      nombre: 'Nuevo ejercicio',
      tipo: 'repeticiones',
      series: '3',
      repeticiones: '10',
      duracionSegundos: '',
      descansoEntreSeries: '60',
    };
    setEjercicios((prev) => [...prev, nuevo]);
  };

  const handleCambiarCampo = (id: string, campo: keyof EjercicioForm, valor: string) => {
    setEjercicios((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (campo === 'nombre') return { ...e, nombre: valor };
        if (campo === 'tipo') {
          const nuevoTipo = valor as 'repeticiones' | 'tiempo';
          return {
            ...e,
            tipo: nuevoTipo,
            repeticiones: nuevoTipo === 'repeticiones' ? '10' : '',
            duracionSegundos: nuevoTipo === 'tiempo' ? '60' : '',
          };
        }
        // Allow any string value for numeric fields
        return { ...e, [campo]: valor };
      }),
    );
  };

  const handleEliminarEjercicio = (id: string) => {
    setEjercicios((prev) => prev.filter((e) => e.id !== id));
  };

  const handleGuardar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      Alert.alert('Nombre requerido', 'La rutina debe tener un nombre.');
      return;
    }
    if (ejercicios.length === 0) {
      Alert.alert('Ejercicios requeridos', 'Agregá al menos un ejercicio.');
      return;
    }

    const ejerciciosProcesados: Ejercicio[] = [];

    for (const e of ejercicios) {
      if (!e.nombre.trim()) {
        Alert.alert('Nombre requerido', 'Todos los ejercicios deben tener nombre.');
        return;
      }

      const series = parseInt(e.series, 10);
      const descanso = parseInt(e.descansoEntreSeries, 10);

      if (isNaN(series) || series <= 0) {
        Alert.alert('Datos inválidos', `Series inválidas en ${e.nombre}`);
        return;
      }
      if (isNaN(descanso) || descanso < 0) {
        Alert.alert('Datos inválidos', `Descanso inválido en ${e.nombre}`);
        return;
      }

      const nuevo: Ejercicio = {
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        series,
        descansoEntreSeries: descanso,
      };

      if (e.tipo === 'repeticiones') {
        const reps = parseInt(e.repeticiones, 10);
        if (isNaN(reps) || reps <= 0) {
          Alert.alert('Datos inválidos', `Repeticiones inválidas en ${e.nombre}`);
          return;
        }
        nuevo.repeticiones = reps;
      } else {
        const duracion = parseInt(e.duracionSegundos, 10);
        if (isNaN(duracion) || duracion <= 0) {
          Alert.alert('Datos inválidos', `Duración inválida en ${e.nombre}`);
          return;
        }
        nuevo.duracionSegundos = duracion;
      }

      ejerciciosProcesados.push(nuevo);
    }

    const rutinas = await StorageService.getRutinas();
    let updated: Rutina[];
    if (rutinaId) {
      updated = rutinas.map((r) =>
        r.id === rutinaId ? { ...r, nombre: nombreTrim, ejercicios: ejerciciosProcesados } : r,
      );
    } else {
      const nueva: Rutina = {
        id: uuidv4(),
        nombre: nombreTrim,
        ejercicios: ejerciciosProcesados,
      };
      updated = [...rutinas, nueva];
    }
    await StorageService.saveRutinas(updated);
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: EjercicioForm }) => {
    const esTiempo = item.tipo === 'tiempo';

    return (
      <RNView style={styles.exerciseCard}>
        <RNView style={styles.exerciseHeader}>
          <Text style={styles.exerciseTitle}>{item.nombre}</Text>
          <TouchableOpacity onPress={() => handleEliminarEjercicio(item.id)}>
            <Text style={styles.delete}>Eliminar</Text>
          </TouchableOpacity>
        </RNView>

        <TextInput
          style={styles.input}
          value={item.nombre}
          placeholder="Nombre del ejercicio"
          placeholderTextColor={colors.textMuted}
          onChangeText={(text) => handleCambiarCampo(item.id, 'nombre', text)}
        />

        <RNView style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, !esTiempo && styles.typeButtonActive]}
            onPress={() => handleCambiarCampo(item.id, 'tipo', 'repeticiones')}
          >
            <Text style={[styles.typeText, !esTiempo && styles.typeTextActive]}>Repeticiones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, esTiempo && styles.typeButtonActive]}
            onPress={() => handleCambiarCampo(item.id, 'tipo', 'tiempo')}
          >
            <Text style={[styles.typeText, esTiempo && styles.typeTextActive]}>Tiempo</Text>
          </TouchableOpacity>
        </RNView>

        <RNView style={styles.row}>
          <RNView style={styles.rowField}>
            <Text style={styles.label}>Series</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={item.series}
              onChangeText={(text) => handleCambiarCampo(item.id, 'series', text)}
            />
          </RNView>

          {esTiempo ? (
            <RNView style={styles.rowField}>
              <Text style={styles.label}>Segundos</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={item.duracionSegundos}
                onChangeText={(text) => handleCambiarCampo(item.id, 'duracionSegundos', text)}
              />
            </RNView>
          ) : (
            <RNView style={styles.rowField}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={item.repeticiones}
                onChangeText={(text) => handleCambiarCampo(item.id, 'repeticiones', text)}
              />
            </RNView>
          )}

          <RNView style={styles.rowField}>
            <Text style={styles.label}>Descanso (s)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={item.descansoEntreSeries}
              onChangeText={(text) => handleCambiarCampo(item.id, 'descansoEntreSeries', text)}
            />
          </RNView>
        </RNView>
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
          contentContainerStyle={{ paddingVertical: spacing.xs }}
        />

        <RNView style={styles.saveButton}>
          <PrimaryButton label="Guardar rutina" onPress={handleGuardar} />
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
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
    marginBottom: spacing.xs,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  delete: {
    color: colors.danger,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rowField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  saveButton: {
    marginBottom: spacing.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
    backgroundColor: colors.primary + '20', // Light opacity primary
  },
  typeText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

