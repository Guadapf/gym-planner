import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, Alert, View as RNView } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { PrimaryButton } from '../components/PrimaryButton';
import { Rutina } from '../models/types';
import { StorageService } from '../storage/storageService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Nav = NativeStackScreenProps<RootStackParamList>['navigation'];

export const RutinasScreen: React.FC = () => {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const navigation = useNavigation<Nav>();

  const cargarRutinas = useCallback(async () => {
    const r = await StorageService.getRutinas();
    setRutinas(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarRutinas();
    }, [cargarRutinas]),
  );

  const handleCrearRutina = () => {
    // Abrimos el editor para que el usuario asigne nombre y ejercicios
    navigation.navigate('RutinaEditor', { rutinaId: undefined });
  };

  const handleEliminarRutina = (id: string) => {
    Alert.alert('Eliminar rutina', '¿Seguro que querés eliminar esta rutina?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const updated = rutinas.filter((r) => r.id !== id);
          setRutinas(updated);
          await StorageService.saveRutinas(updated);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Rutina }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('RutinaEditor', { rutinaId: item.id })}
    >
      <RNView style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.nombre}</Text>
        <Text style={styles.itemSubtitle}>{item.ejercicios.length} ejercicios</Text>
      </RNView>
      <TouchableOpacity onPress={() => handleEliminarRutina(item.id)}>
        <Text style={styles.delete}>Eliminar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <Text style={styles.title}>Tus rutinas</Text>

        <RNView style={styles.newRow}>
          <PrimaryButton label="Crear" onPress={handleCrearRutina} />
        </RNView>

        <FlatList
          data={rutinas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: spacing.xs, marginTop: spacing.xl }}
        />
      </RNView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  newRow: {
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  delete: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});

