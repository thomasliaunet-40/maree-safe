import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VerdictResult, VerdictLevel, HourlyWeather } from '../types';
import { TidePoint } from '../types';
import { COLORS } from '../constants/colors';
import TideChartVertical from './TideChartVertical';

interface Props {
  verdict: VerdictResult;
  tidePoints: TidePoint[];
  hourlyWeather: HourlyWeather[];
  isToday: boolean;
}

const CONFIG: Record<
  VerdictLevel,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }
> = {
  green:  { icon: 'checkmark-circle', color: COLORS.green,  bg: COLORS.greenBg,  border: COLORS.greenBorder },
  orange: { icon: 'warning',          color: COLORS.orange, bg: COLORS.orangeBg, border: COLORS.orangeBorder },
  red:    { icon: 'close-circle',     color: COLORS.red,    bg: COLORS.redBg,    border: COLORS.redBorder },
};

export default function VerdictBanner({ verdict, tidePoints, hourlyWeather, isToday }: Props) {
  const { color, bg, border, icon } = CONFIG[verdict.level];

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
      {/* Label section */}
      <View style={styles.sectionLabel}>
        <Ionicons name="compass-outline" size={13} color={COLORS.textMuted} />
        <Text style={styles.sectionLabelText}>L'avis de MaréeSafe</Text>
      </View>

      {/* Verdict principal */}
      <View style={styles.header}>
        <Ionicons name={icon} size={28} color={color} />
        <View style={styles.titles}>
          <Text style={[styles.title, { color }]}>{verdict.title}</Text>
          <Text style={styles.subtitle}>{verdict.subtitle}</Text>
        </View>
      </View>

      {/* Graphique vertical marée + couleurs météo */}
      {tidePoints.length > 0 && (
        <TideChartVertical
          points={tidePoints}
          hourlyWeather={hourlyWeather}
          isToday={isToday}
        />
      )}

      {/* Raisons */}
      {verdict.reasons.length > 0 && (
        <View style={styles.reasons}>
          {verdict.reasons.map((reason, i) => (
            <Text key={i} style={styles.reason}>• {reason}</Text>
          ))}
        </View>
      )}

      {/* Plage recommandée */}
      {verdict.recommendedWindow && (
        <View style={[styles.window, { borderTopColor: border }]}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.windowLabel}> Plage recommandée : </Text>
          <Text style={[styles.windowTime, { color }]}>
            {verdict.recommendedWindow.start} – {verdict.recommendedWindow.end}
          </Text>
        </View>
      )}

      {!verdict.recommendedWindow && verdict.level === 'red' && (
        <View style={[styles.window, { borderTopColor: border }]}>
          <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
          <Text style={[styles.windowLabel, { color: COLORS.textMuted }]}>
            {' '}Aucune fenêtre favorable aujourd'hui
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  sectionLabelText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reasons: {
    marginTop: 12,
    gap: 3,
  },
  reason: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  window: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  windowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  windowTime: {
    fontSize: 13,
    fontWeight: '600',
  },
});
