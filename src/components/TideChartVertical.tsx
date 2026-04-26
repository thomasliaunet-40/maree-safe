import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { TidePoint, HourlyWeather } from '../types';
import { COLORS } from '../constants/colors';
import { assessConditions } from '../utils/verdictCalculator';

interface Props {
  points: TidePoint[];
  hourlyWeather: HourlyWeather[];
  isToday: boolean;
}

const CHART_H = 480;       // hauteur du graphique en px
const Y_LABEL_W = 28;      // largeur colonne heures
const PADDING_RIGHT = 4;

const LEVEL_COLOR: Record<string, string> = {
  green: '#22C55E',
  orange: '#F59E0B',
  red:  '#EF4444',
};

const TIME_LABELS = [
  { label: '0h',  frac: 0 },
  { label: '6h',  frac: 0.25 },
  { label: '12h', frac: 0.5 },
  { label: '18h', frac: 0.75 },
  { label: '24h', frac: 1 },
];

function fracOfDay(isoTime: string): number {
  const d = new Date(isoTime);
  return (d.getHours() * 60 + d.getMinutes()) / (24 * 60);
}

export default function TideChartVertical({ points, hourlyWeather, isToday }: Props) {
  const { width } = useWindowDimensions();
  const chartW = width - 32 - Y_LABEL_W - PADDING_RIGHT;

  const data = useMemo(() => {
    if (points.length < 2) return null;

    const heights = points.map(p => p.height);
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const midH = (minH + maxH) / 2;
    const range = maxH - minH || 1;

    const toX = (h: number) => ((h - minH) / range) * chartW;
    const toY = (iso: string) => fracOfDay(iso) * CHART_H;

    // Courbe SVG (segments linéaires — 48 pts = déjà très lisse)
    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.height).toFixed(1)},${toY(p.time).toFixed(1)}`)
      .join(' ');

    const midX = toX(midH);

    // Bandes colorées avec dégradé entre heures adjacentes
    const bands = hourlyWeather.map((hw, i) => {
      const level = assessConditions(hw.windSpeed, hw.windGust, hw.waveHeight).overall;
      const color = LEVEL_COLOR[level];
      const y = fracOfDay(hw.time) * CHART_H;
      const nextHw = hourlyWeather[i + 1];
      const nextY = nextHw ? fracOfDay(nextHw.time) * CHART_H : CHART_H;
      const nextLevel = nextHw
        ? assessConditions(nextHw.windSpeed, nextHw.windGust, nextHw.waveHeight).overall
        : level;
      const nextColor = LEVEL_COLOR[nextLevel];
      return { y, height: nextY - y, color, nextColor, id: `g${i}` };
    });

    // Position heure actuelle
    const nowY = isToday
      ? (() => {
          const n = new Date();
          return ((n.getHours() * 60 + n.getMinutes()) / (24 * 60)) * CHART_H;
        })()
      : null;

    // Labels X (min / mid / max)
    const xLabels = [
      { label: `${minH.toFixed(1)}m`, x: toX(minH) },
      { label: `${midH.toFixed(1)}m`, x: midX },
      { label: `${maxH.toFixed(1)}m`, x: toX(maxH) },
    ];

    return { d, midX, bands, nowY, xLabels };
  }, [points, hourlyWeather, isToday, chartW]);

  if (!data) return null;

  return (
    <View style={styles.wrapper}>
      {/* Colonne heures */}
      <View style={[styles.yAxis, { height: CHART_H }]}>
        {TIME_LABELS.map(({ label, frac }) => (
          <Text
            key={label}
            style={[styles.timeLabel, { top: frac * CHART_H - 7 }]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Zone SVG */}
      <View>
        <Svg width={chartW} height={CHART_H}>
          <Defs>
            {data.bands.map(b => (
              <LinearGradient key={b.id} id={b.id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={b.color}     stopOpacity={0.28} />
                <Stop offset="100%" stopColor={b.nextColor} stopOpacity={0.28} />
              </LinearGradient>
            ))}
          </Defs>

          {/* Bandes couleur dégradées */}
          {data.bands.map(b => (
            <Rect
              key={b.id}
              x={0} y={b.y}
              width={chartW} height={b.height + 0.5}
              fill={`url(#${b.id})`}
            />
          ))}

          {/* Ligne mi-marée (verticale pointillée) */}
          <Line
            x1={data.midX} y1={0}
            x2={data.midX} y2={CHART_H}
            stroke={COLORS.borderLight}
            strokeWidth={1}
            strokeDasharray="3,4"
          />

          {/* Lignes horizontales légères aux heures clés */}
          {TIME_LABELS.filter(t => t.frac > 0 && t.frac < 1).map(({ label, frac }) => (
            <Line
              key={label}
              x1={0} y1={frac * CHART_H}
              x2={chartW} y2={frac * CHART_H}
              stroke={COLORS.border}
              strokeWidth={0.5}
            />
          ))}

          {/* Courbe de marée */}
          <Path
            d={data.d}
            fill="none"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />

          {/* Marqueur heure actuelle */}
          {data.nowY !== null && (
            <>
              <Line
                x1={0} y1={data.nowY}
                x2={chartW} y2={data.nowY}
                stroke={COLORS.tidalBarCurrent}
                strokeWidth={1.5}
              />
              <Circle
                cx={0} cy={data.nowY}
                r={4}
                fill={COLORS.tidalBarCurrent}
              />
            </>
          )}
        </Svg>

        {/* Labels X (hauteurs) */}
        <View style={[styles.xAxis, { width: chartW }]}>
          {data.xLabels.map(({ label, x }) => (
            <Text
              key={label}
              style={[styles.xLabel, { left: x - 14 }]}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  yAxis: {
    width: Y_LABEL_W,
    position: 'relative',
  },
  timeLabel: {
    position: 'absolute',
    fontSize: 10,
    color: COLORS.textMuted,
    width: Y_LABEL_W,
    textAlign: 'right',
    paddingRight: 4,
  },
  xAxis: {
    position: 'relative',
    height: 16,
    marginTop: 2,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 9,
    color: COLORS.textMuted,
    width: 28,
    textAlign: 'center',
  },
});
