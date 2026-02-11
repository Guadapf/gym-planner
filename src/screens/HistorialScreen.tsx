import React, { useEffect, useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Text } from '../components/Themed';
import { colors, spacing } from '../components/Themed';
import { Calendar } from '../components/Calendar';
import { HistorialEntrenamiento } from '../models/types';
import { StorageService } from '../storage/storageService';

export const HistorialScreen: React.FC = () => {
  const [historial, setHistorial] = useState<HistorialEntrenamiento[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const h = await StorageService.getHistorial();
      setHistorial(h);
    })();
  }, []);

  const highlightedDates = historial.map((h) => h.fecha);
  const entrenamientoSeleccionado = selectedDate
    ? historial.filter((h) => h.fecha === selectedDate)
    : [];

  return (
    <ScreenContainer>
      <RNView style={styles.container}>
        <Text style={styles.title}>Historial</Text>
        <Calendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          highlightedDates={highlightedDates}
          onChangeMonth={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          onSelectDate={(date) => setSelectedDate(date)}
        />

        <RNView style={styles.detail}>
          {selectedDate && entrenamientoSeleccionado.length > 0 ? (
            <>
              <Text style={styles.detailTitle}>Entrenamiento del {selectedDate}</Text>
              {entrenamientoSeleccionado.map((e) => (
                <Text key={e.id} style={styles.detailText}>
                  {e.rutinaNombre} (índice {e.indiceRutina + 1})
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.detailEmpty}>
              Seleccioná un día con color para ver qué rutina hiciste.
            </Text>
          )}
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
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  detail: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  detailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  detailEmpty: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

