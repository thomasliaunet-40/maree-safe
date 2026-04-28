import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { COLORS } from '../constants/colors';

const PPH = 42; // pixels per hour
const SVG_H = 84;
const TICK_H = 22;

function scoreToColor(s: number): string {
  if (s >= 75) return '#8fc8a3';
  if (s >= 55) return '#c0d99a';
  if (s >= 35) return '#f3b96b';
  return '#e88a82';
}

export interface VerdictTimelineHandle {
  scrollToNow: () => void;
}

interface Props {
  scores: number[];        // N valeurs, une par heure
  tideHeights?: number[];  // N valeurs, hauteur marée
  startEpoch: number;      // timestamp ms de l'index 0
  cursorHourOffset: number; // heures depuis index 0 où le curseur est fixé
  onOffsetChange?: (offsetFromCursor: number) => void; // heures depuis cursorHourOffset
}

const VerdictTimeline = forwardRef<VerdictTimelineHandle, Props>(
  ({ scores, tideHeights, startEpoch, cursorHourOffset, onOffsetChange }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const totalHours = scores.length;
    const contentWidth = totalHours * PPH;
    const cursorX = cursorHourOffset * PPH;

    useImperativeHandle(ref, () => ({
      scrollToNow: () => scrollRef.current?.scrollTo({ x: 0, animated: true }),
    }));

    const handleScroll = (scrollX: number) => {
      const contentX = scrollX + cursorX;
      const offsetFromCursor = contentX / PPH - cursorHourOffset;
      const snapped = Math.round(offsetFromCursor * 2) / 2;
      onOffsetChange?.(snapped);
    };

    // Courbe de marée
    const hasTide = tideHeights && tideHeights.some(h => h > 0);
    let tidePath = '';
    if (hasTide && tideHeights) {
      const valid = tideHeights.filter(h => h > 0);
      const minH = Math.min(...valid);
      const maxH = Math.max(...valid);
      const range = Math.max(maxH - minH, 0.5);
      const pts = tideHeights.map((h, i) => {
        const x = i * PPH + PPH / 2;
        const hv = h > 0 ? h : minH;
        const y = SVG_H * 0.85 - ((hv - minH) / range) * (SVG_H * 0.55);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      tidePath = 'M ' + pts.join(' L ');
    }

    // Repères toutes les 6h
    const ticks: { i: number; label: string }[] = [];
    for (let i = 0; i <= totalHours; i += 6) {
      const d = new Date(startEpoch + i * 3600000);
      ticks.push({ i, label: `${String(d.getHours()).padStart(2, '0')}h` });
    }

    return (
      <View style={styles.outer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={e => handleScroll(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          contentContainerStyle={{ width: contentWidth }}
        >
          {/* Contenu scrollable : barres + marée + repères */}
          <View style={{ width: contentWidth, height: SVG_H + TICK_H }}>
            <Svg width={contentWidth} height={SVG_H}>
              {scores.map((score, i) => (
                <Rect key={i} x={i * PPH} y={0} width={PPH + 1} height={SVG_H} fill={scoreToColor(score)} />
              ))}
              {hasTide && (
                <Path
                  d={tidePath}
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {ticks.map(t => (
                <Line
                  key={t.i}
                  x1={t.i * PPH} y1={SVG_H - 10}
                  x2={t.i * PPH} y2={SVG_H}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1}
                />
              ))}
            </Svg>
            {/* Labels des repères */}
            {ticks.map(t => (
              <View
                key={t.i}
                style={[styles.tickWrap, { left: t.i * PPH - 14 }]}
              >
                <Text style={styles.tick}>{t.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Curseur fixe */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.cursorLine, { left: cursorX - 1 }]} />
          <View style={[styles.cursorCircle, { left: cursorX - 8, top: SVG_H / 2 - 8 }]} />
          <View style={[styles.cursorDot, { left: cursorX - 3.5, top: SVG_H / 2 - 3.5 }]} />
        </View>
      </View>
    );
  }
);

export default VerdictTimeline;

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    overflow: 'hidden',
    height: SVG_H + TICK_H,
    position: 'relative',
  },
  tickWrap: {
    position: 'absolute',
    top: SVG_H + 4,
    width: 28,
    alignItems: 'center',
  },
  tick: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: 'rgba(255,255,255,0.55)',
  },
  cursorLine: {
    position: 'absolute',
    top: 0,
    width: 2.5,
    height: SVG_H,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cursorCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cursorDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.ink,
    opacity: 0.65,
  },
});
