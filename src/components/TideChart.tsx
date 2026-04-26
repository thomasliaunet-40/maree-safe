import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { TidePoint } from '../types';
import { COLORS } from '../constants/colors';

interface Props {
  points: TidePoint[];
  isToday: boolean;
}

const CHART_HEIGHT = 72;
const NUM_BARS = 72; // un bar par 20 minutes
const AXIS_LABELS = ['0h', '6h', '12h', '18h', '24h'];

export default function TideChart({ points, isToday }: Props) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 64; // padding horizontal

  const bars = useMemo(() => {
    if (points.length === 0) return [];

    const heights = points.map(p => p.height);
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const range = maxH - minH || 1;

    const step = Math.max(1, Math.floor(points.length / NUM_BARS));
    const sampled = [];
    for (let i = 0; i < NUM_BARS; i++) {
      const idx = Math.min(Math.round((i / NUM_BARS) * points.length), points.length - 1);
      sampled.push(points[idx]);
    }

    const now = Date.now();

    return sampled.map((point, i) => {
      const normalized = (point.height - minH) / range;
      const barHeight = Math.max(3, normalized * CHART_HEIGHT);
      const pointTime = new Date(point.time).getTime();
      const isCurrent = isToday && Math.abs(pointTime - now) < 12 * 60 * 1000;
      const isPast = isToday && pointTime < now;

      return { normalized, barHeight, isCurrent, isPast };
    });
  }, [points]);

  if (bars.length === 0) return null;

  const barWidth = chartWidth / NUM_BARS;

  return (
    <View style={styles.container}>
      {/* Barre du graphique */}
      <View style={[styles.chart, { height: CHART_HEIGHT, width: chartWidth }]}>
        {bars.map((bar, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth - 0.5,
                height: bar.barHeight,
                backgroundColor: bar.isCurrent
                  ? COLORS.tidalBarCurrent
                  : bar.isPast
                  ? `rgba(14, 165, 233, ${0.35 + bar.normalized * 0.35})`
                  : `rgba(14, 165, 233, ${0.55 + bar.normalized * 0.45})`,
              },
            ]}
          />
        ))}
      </View>

      {/* Axe temporel */}
      <View style={[styles.timeAxis, { width: chartWidth }]}>
        {AXIS_LABELS.map((label, i) => (
          <Text key={i} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    borderRadius: 1,
    marginHorizontal: 0.25,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
});
