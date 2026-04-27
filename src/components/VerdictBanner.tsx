import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VerdictResult, VerdictLevel, HourlyWeather } from '../types';
import { TidePoint } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import TideChartVertical from './TideChartVertical';

interface Props {
  verdict: VerdictResult;
  tidePoints: TidePoint[];
  hourlyWeather: HourlyWeather[];
  isToday: boolean;
}

const CONFIG: Record<
  VerdictLevel,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string; label: string }
> = {
  green:  { icon: 'checkmark-circle', color: COLORS.green,  bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)',   label: 'FAVORABLE' },
  orange: { icon: 'warning',          color: COLORS.orange, bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)',  label: 'PRUDENCE' },
  red:    { icon: 'close-circle',     color: COLORS.red,    bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',   label: 'DÉCONSEILLÉ' },
};

export default function VerdictBanner({ verdict, tidePoints, hourlyWeather, isToday }: Props) {
  const { color, bg, border, icon, label } = CONFIG[verdict.level];

  // Récupère les métriques de l'heure courante ou la première heure dispo
  const currentHour = hourlyWeather[0];

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>

      {/* Badge niveau */}
      <View style={[styles.levelBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={12} color="#fff" />
        <Text style={styles.levelBadgeText}>{label}</Text>
      </View>

      {/* Grand titre verdict */}
      <Text style={[styles.title, { color }]}>{verdict.title}</Text>
      <Text style={styles.subtitle}>{verdict.subtitle}</Text>

      {/* Métriques météo en ligne */}
      {currentHour && (
        <View style={styles.metricsRow}>
          <MetricBadge
            icon="thunderstorm-outline"
            value={`${Math.round(currentHour.windSpeed)} kt`}
            label="Vent"
          />
          <MetricBadge
            icon="water-outline"
            value={`${currentHour.waveHeight.toFixed(1)} m`}
            label="Vagues"
          />
          {verdict.recommendedWindow ? (
            <MetricBadge
              icon="time-outline"
              value={`${verdict.recommendedWindow.start}`}
              label="Meilleure heure"
            />
          ) : (
            <MetricBadge
              icon="eye-outline"
              value="—"
              label="Visibilité"
            />
          )}
        </View>
      )}

      {/* Graphique vertical marée + couleurs météo */}
      {tidePoints.length > 0 && (
        <TideChartVertical
          points={tidePoints}
          hourlyWeather={hourlyWeather}
          isToday={isToday}
        />
      )}

      {/* Raisons détaillées */}
      {verdict.reasons.length > 0 && (
        <View style={styles.reasons}>
          {verdict.reasons.map((reason, i) => (
            <View key={i} style={styles.reasonRow}>
              <View style={[styles.reasonDot, { backgroundColor: color }]} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
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

function MetricBadge({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  levelBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(22,181,176,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(22,181,176,0.15)',
  },
  metricValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textMuted,
  },
  reasons: {
    marginTop: 12,
    gap: 5,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textSecondary,
    flex: 1,
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
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textSecondary,
  },
  windowTime: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
});
