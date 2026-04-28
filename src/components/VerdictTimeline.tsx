import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Path } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { COLORS } from '../constants/colors';

function scoreToColor(s: number): string {
  if (s >= 75) return '#8fc8a3';
  if (s >= 55) return '#c0d99a';
  if (s >= 35) return '#f3b96b';
  return '#e88a82';
}

interface Props {
  hourlyScores: number[];
  recommendedWindow: { start: number; end: number } | null;
  currentHour: number;
}

export default function VerdictTimeline({ hourlyScores, recommendedWindow, currentHour }: Props) {
  const W = 320;
  const H = 84;
  const nowPct = (currentHour / 24) * 100;

  // Courbe sinusoïdale symbolique : 2 cycles sur 24h, légèrement décalés
  const tidePts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = (i / 48) * W;
    const y = H / 2 - Math.sin((i / 48 * 4 * Math.PI) - Math.PI / 3) * (H * 0.32);
    tidePts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const tidePath = 'M ' + tidePts.join(' L ');

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

          {/* Courbe symbolique de marée */}
          <Path
            d={tidePath}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

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
    height: 84,
    borderRadius: 18,
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
