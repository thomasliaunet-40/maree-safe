import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function DateStrip({ selectedDate, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // Générer les 9 jours (J → J+8)
  const days = Array.from({ length: 9 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Scroller automatiquement vers la date sélectionnée
  useEffect(() => {
    const idx = days.findIndex(d => isSameDay(d, selectedDate));
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * CHIP_WIDTH, animated: true });
    }
  }, [selectedDate]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {days.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = i === 0;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => onSelect(day)}
              activeOpacity={0.7}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipDay, isSelected && styles.chipTextSelected]}>
                {isToday ? 'Auj.' : DAY_ABBR[day.getDay()]}
              </Text>
              <Text style={[styles.chipNum, isSelected && styles.chipTextSelected]}>
                {day.getDate()}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CHIP_WIDTH = 56;

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  strip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  chip: {
    width: CHIP_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipDay: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipNum: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chipTextSelected: {
    color: '#fff',
  },
  chipTextDisabled: {
    color: COLORS.textMuted,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
});
