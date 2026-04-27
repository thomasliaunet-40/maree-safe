import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TideData } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { formatTime, coefficientLabel } from '../utils/tideCalculator';

interface Props {
  data: TideData;
  isToday: boolean;
}

function coefficientColor(coeff: number): string {
  if (coeff >= 95) return COLORS.red;
  if (coeff >= 80) return COLORS.orange;
  if (coeff >= 50) return COLORS.green;
  return COLORS.primary;
}

export default function TideCard({ data, isToday }: Props) {
  const { peaks, coefficient, currentHeight, isRising, points } = data;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="water" size={18} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Marées</Text>
        <View style={styles.coeffBadgeInline}>
          <Text style={[styles.coeffValue, { color: coefficientColor(coefficient) }]}>
            {coefficient}
          </Text>
          <Text style={styles.coeffLabel}>{coefficientLabel(coefficient)}</Text>
        </View>
      </View>

      {/* Hauteur actuelle — uniquement pour aujourd'hui */}
      {isToday && (
        <View style={styles.currentRow}>
          <View style={styles.currentHeight}>
            <Text style={styles.currentHeightValue}>{currentHeight.toFixed(1)} m</Text>
            <Text style={styles.currentHeightLabel}>hauteur actuelle</Text>
          </View>
          <View style={styles.rising}>
            <Ionicons
              name={isRising ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={isRising ? COLORS.green : COLORS.orange}
            />
            <Text style={[styles.risingLabel, { color: isRising ? COLORS.green : COLORS.orange }]}>
              {isRising ? 'Montante' : 'Descendante'}
            </Text>
          </View>
        </View>
      )}

      {/* Horaires PM / BM */}
      <View style={styles.peaksGrid}>
        {peaks.map((peak, i) => (
          <View key={i} style={styles.peakItem}>
            <Text style={[styles.peakLabel, { color: peak.type === 'high' ? COLORS.primaryLight : COLORS.textMuted }]}>
              {peak.label}
            </Text>
            <Text style={styles.peakTime}>{formatTime(peak.time)}</Text>
            <Text style={styles.peakHeight}>{peak.height.toFixed(2)} m</Text>
          </View>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  coeffBadgeInline: {
    marginLeft: 'auto',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  currentHeight: {
    flex: 1,
  },
  currentHeightValue: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  currentHeightLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  rising: {
    alignItems: 'center',
    gap: 2,
  },
  risingLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  coeffBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  coeffValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  coeffLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
  peaksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  peakItem: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  peakLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  peakTime: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  peakHeight: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});
