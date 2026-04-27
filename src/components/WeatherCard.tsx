import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeatherData } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { degreesToCompass, windArrow, beaufortScale } from '../utils/windDirection';

interface Props {
  data: WeatherData;
}

interface StatRowProps {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  detail?: string;
}

function StatRow({ label, value, unit, color, detail }: StatRowProps) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
        <Text style={[styles.statValue, color ? { color } : undefined]}>
          {value}
          {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
        </Text>
      </View>
    </View>
  );
}

function windColor(knots: number): string {
  if (knots > 25) return COLORS.red;
  if (knots > 15) return COLORS.orange;
  return COLORS.green;
}

function waveColor(meters: number): string {
  if (meters > 2.5) return COLORS.red;
  if (meters > 1.5) return COLORS.orange;
  return COLORS.green;
}

export default function WeatherCard({ data }: Props) {
  const { windSpeed, windGust, windDirection, waveHeight, waveDirection } = data;
  const compass = degreesToCompass(windDirection);
  const arrow = windArrow(windDirection);
  const beaufort = beaufortScale(windSpeed);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="partly-sunny" size={18} color={COLORS.orange} />
        <Text style={styles.cardTitle}>Météo Marine</Text>
      </View>

      {/* Vent principal */}
      <View style={styles.windMain}>
        <View style={styles.windSpeed}>
          <Text style={[styles.windValue, { color: windColor(windSpeed) }]}>
            {Math.round(windSpeed)}
          </Text>
          <Text style={styles.windUnit}>nœuds</Text>
        </View>

        <View style={styles.windDirection}>
          <Text style={styles.windArrow}>{arrow}</Text>
          <Text style={styles.windCompass}>{compass}</Text>
          <Text style={styles.windBeaufort}>Force {beaufort.force}</Text>
          <Text style={styles.windDesc}>{beaufort.description}</Text>
        </View>

        <View style={styles.waveMain}>
          <Text style={[styles.waveValue, { color: waveColor(waveHeight) }]}>
            {waveHeight.toFixed(1)}
          </Text>
          <Text style={styles.waveUnit}>m vagues</Text>
          {waveDirection > 0 && (
            <Text style={styles.waveDir}>{degreesToCompass(waveDirection)}</Text>
          )}
        </View>
      </View>

      {/* Détails */}
      <View style={styles.details}>
        <StatRow
          label="Rafales"
          value={`${Math.round(windGust)}`}
          unit="nœuds"
          color={windColor(windGust)}
        />
        <View style={styles.divider} />
        <StatRow
          label="Direction vent"
          value={`${compass} (${Math.round(windDirection)}°)`}
          detail={arrow}
        />
        {waveHeight > 0 && (
          <>
            <View style={styles.divider} />
            <StatRow
              label="Hauteur vagues"
              value={`${waveHeight.toFixed(1)}`}
              unit="m"
              color={waveColor(waveHeight)}
            />
          </>
        )}
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
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  windMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  windSpeed: {
    alignItems: 'center',
    flex: 1,
  },
  windValue: {
    fontSize: 40,
    fontFamily: FONTS.bold,
    letterSpacing: -1,
  },
  windUnit: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: -2,
  },
  windDirection: {
    alignItems: 'center',
    flex: 1,
  },
  windArrow: {
    fontSize: 28,
    color: COLORS.textPrimary,
    lineHeight: 34,
  },
  windCompass: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  windBeaufort: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    marginTop: 2,
  },
  windDesc: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  waveMain: {
    alignItems: 'center',
    flex: 1,
  },
  waveValue: {
    fontSize: 40,
    fontFamily: FONTS.bold,
    letterSpacing: -1,
  },
  waveUnit: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: -2,
    textAlign: 'center',
  },
  waveDir: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginTop: 2,
  },
  details: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  statRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  statDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
});
