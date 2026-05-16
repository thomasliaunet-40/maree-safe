import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { VerdictLevel } from '../types';

interface Props {
  selectedDate: Date;
  maxDate: Date;
  verdicts: Record<string, VerdictLevel>;
  onSelect: (date: Date) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function chipColors(level: VerdictLevel | undefined): { bg: string; ink: string } {
  if (level === 'orange') return { bg: COLORS.warn,  ink: '#7a3d18' };
  if (level === 'red')    return { bg: COLORS.stop,  ink: '#fff' };
  if (level === 'green')  return { bg: COLORS.go,    ink: COLORS.goInk };
  return { bg: COLORS.paperSoft, ink: COLORS.ink3 };
}

export default function DateStrip({ selectedDate, maxDate, verdicts, onSelect }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  }).filter(d => d <= maxDate);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.outer}
    >
      {days.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const { bg, ink } = chipColors(verdicts[dateKey(day)]);
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onSelect(day)}
            activeOpacity={0.75}
            style={[styles.chip, { backgroundColor: bg }, isSelected && styles.chipSel]}
          >
            <Text style={[styles.dayName, { color: ink }]}>
              {DAY_ABBR[day.getDay()]}
            </Text>
            <Text style={[styles.dayNum, { color: ink }]}>{day.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer:   { flexShrink: 0 },
  strip:   { paddingHorizontal: 22, paddingBottom: 10, gap: 6, alignItems: 'flex-start' },
  chip:    { width: 46, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
  chipSel: { borderWidth: 2.5, borderColor: COLORS.ink },
  dayName: { fontSize: 10, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.75 },
  dayNum:  { fontSize: 17, fontFamily: FONTS.display, marginTop: 2 },
});
