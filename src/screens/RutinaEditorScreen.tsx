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

export const RutinaEditorScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rutinaId } = route.params || {};
  const [nombre, setNombre] = useState('');
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);

  useEffect(() => {
    if (!rutinaId) return;
    (async () => {
      const rutinas = await StorageService.getRutinas();
      const rutina = rutinas.find((r) => r.id === rutinaId);
      if (rutina) {
        setNombre(rutina.nombre);
        setEjercicios(rutina.ejercicios);
      }
    })();
  }, [rutinaId]);

  const handleAgregarEjercicio = () => {
    const nuevo: Ejercicio = {
      id: uuidv4(),
      nombre: 'Nuevo ejercicio',
      series: 3,
      repeticiones: 10,
      descansoEntreSeries: 60,
    };
    setEjercicios((prev) => [...prev, nuevo]);
  };

  const handleCambiarCampo = (id: string, campo: keyof Ejercicio, valor: string) => {
    setEjercicios((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (campo === 'nombre') {
          return { ...e, nombre: valor };
        }
        const num = parseInt(valor, 10);
        if (Number.isNaN(num)) return e;
        if (campo === 'series') return { ...e, series: Math.max(1, num) };
        if (campo === 'repeticiones') return { ...e, repeticiones: Math.max(1, num) };
        if (campo === 'descansoEntreSeries')
          return { ...e, descansoEntreSeries: Math.max(0, num) };
        return e;
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
    for (const e of ejercicios) {
      if (!e.nombre.trim()) {
        Alert.alert('Nombre requerido', 'Todos los ejercicios deben tener nombre.');
        return;
      }
      if (e.series <= 0 || e.repeticiones <= 0 || e.descansoEntreSeries < 0) {
        Alert.alert('Datos inválidos', 'Revisá series, repeticiones y descanso.');
        return;
      }
    }

    const rutinas = await StorageService.getRutinas();
    let updated: Rutina[];
    if (rutinaId) {
      updated = rutinas.map((r) =>
        r.id === rutinaId ? { ...r, nombre: nombreTrim, ejercicios } : r,
      );
    } else {
      const nueva: Rutina = {
        id: uuidv4(),
        nombre: nombreTrim,
        ejercicios,
      };
      updated = [...rutinas, nueva];
    }
    await StorageService.saveRutinas(updated);
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: Ejercicio }) => (
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
      <RNView style={styles.row}>
        <RNView style={styles.rowField}>
          <Text style={styles.label}>Series</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(item.series)}
            onChangeText={(text) => handleCambiarCampo(item.id, 'series', text)}
          />
        </RNView>
        <RNView style={styles.rowField}>
          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(item.repeticiones)}
            onChangeText={(text) => handleCambiarCampo(item.id, 'repeticiones', text)}
          />
        </RNView>
        <RNView style={styles.rowField}>
          <Text style={styles.label}>Descanso (s)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(item.descansoEntreSeries)}
            onChangeText={(text) => handleCambiarCampo(item.id, 'descansoEntreSeries', text)}
          />
        </RNView>
      </RNView>
    </RNView>
  );

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
    backgroundColor:  colors.cardElevated,
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
});

