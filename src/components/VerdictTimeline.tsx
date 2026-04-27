import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Rect as SvgRect } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { COLORS } from '../constants/colors';

function scoreToColor(s: number): string {
  if (s >= 75) return '#8fc8a3';
  if (s >= 55) return '#c0d99a';
  if (s >= 35) return '#f3b96b';
  return '#e88a82';
}

interface Props {
  hourlyScores: number[];            // 24 valeurs
  recommendedWindow: { start: number; end: number } | null;
  currentHour: number;
}

export default function VerdictTimeline({ hourlyScores, recommendedWindow, currentHour }: Props) {
  const W = 320;
  const H = 56;

  const nowPct = (currentHour / 24) * 100;
  const winLeftPct  = recommendedWindow ? (recommendedWindow.start / 24) * 100 : null;
  const winWidthPct = recommendedWindow ? ((recommendedWindow.end - recommendedWindow.start + 1) / 24) * 100 : null;

  return (
    <View>
      <View style={styles.bar}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            {hourlyScores.map((_, i) => (
              <LinearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={scoreToColor(hourlyScores[i])} stopOpacity="1" />
                <Stop offset="100%" stopColor={scoreToColor(hourlyScores[Math.min(i + 1, 23)])} stopOpacity="1" />
              </LinearGradient>
            ))}
          </Defs>
          {hourlyScores.map((_, i) => {
            const x = (i / 24) * W;
            const w = W / 24;
            return <Rect key={i} x={x} y={0} width={w + 0.5} height={H} fill={`url(#g${i})`} />;
          })}

          {/* Fenêtre recommandée */}
          {winLeftPct !== null && winWidthPct !== null && (
            <Rect
              x={(winLeftPct / 100) * W}
              y={1}
              width={(winWidthPct / 100) * W}
              height={H - 2}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={2.5}
              rx={14}
            />
          )}

          {/* Curseur maintenant */}
          <Line
            x1={(nowPct / 100) * W}
            y1={-4}
            x2={(nowPct / 100) * W}
            y2={H + 4}
            stroke={COLORS.ink}
            strokeWidth={3}
          />
        </Svg>
      </View>
      <View style={styles.ticks}>
        {['0h', '6h', '12h', '18h', '24h'].map(t => (
          <Text key={t} style={styles.tick}>{t}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  tick: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.ink3,
  },
});
