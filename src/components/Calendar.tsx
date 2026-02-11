import React from 'react';
import { StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text } from './Themed';
import { colors, spacing } from './Themed';
import { formatDateLocal } from '../utils/dateUtils';

interface CalendarProps {
  year: number;
  month: number; // 0-based
  selectedDate: string | null; // YYYY-MM-DD
  highlightedDates: string[]; // YYYY-MM-DD
  onChangeMonth: (year: number, month: number) => void;
  onSelectDate: (date: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  year,
  month,
  selectedDate,
  highlightedDates,
  onChangeMonth,
  onSelectDate,
}) => {
  const firstDay = new Date(year, month, 1);
  const startWeekDay = firstDay.getDay(); // 0 domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < startWeekDay; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  const isHighlighted = (day: number | null) => {
    if (!day) return false;
    const iso = toIso(year, month, day);
    return highlightedDates.includes(iso);
  };

  const isSelected = (day: number | null) => {
    if (!day || !selectedDate) return false;
    const iso = toIso(year, month, day);
    return iso === selectedDate;
  };

  return (
    <RNView>
      <RNView style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            const prev = new Date(year, month - 1, 1);
            onChangeMonth(prev.getFullYear(), prev.getMonth());
          }}
        >
          <Text style={styles.nav}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.month}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => {
            const next = new Date(year, month + 1, 1);
            onChangeMonth(next.getFullYear(), next.getMonth());
          }}
        >
          <Text style={styles.nav}>{'>'}</Text>
        </TouchableOpacity>
      </RNView>

      <RNView style={styles.weekRow}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, index) => (
          <RNView key={`${d}-${index}`} style={styles.cell}>
            <Text style={styles.weekday}>{d}</Text>
          </RNView>
        ))}
      </RNView>

      {weeks.map((week, i) => (
        <RNView key={i} style={styles.weekRow}>
          {week.map((day, idx) => {
            const highlighted = isHighlighted(day);
            const selected = isSelected(day);
            const iso = day ? toIso(year, month, day) : '';
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.cell,
                  highlighted && styles.highlightedCell,
                  selected && styles.selectedCell,
                ]}
                disabled={!day}
                onPress={() => day && onSelectDate(iso)}
              >
                <Text style={styles.dayText}>{day ?? ''}</Text>
              </TouchableOpacity>
            );
          })}
        </RNView>
      ))}
    </RNView>
  );
};

function toIso(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  return formatDateLocal(d);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  nav: {
    fontSize: 18,
    paddingHorizontal: spacing.sm,
  },
  month: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  weekday: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dayText: {
    fontSize: 14,
  },
  highlightedCell: {
    backgroundColor: colors.cardElevated,
  },
  selectedCell: {
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderColor: colors.primary,
  },
});

