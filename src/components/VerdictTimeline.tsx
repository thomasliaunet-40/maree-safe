import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { COLORS } from '../constants/colors';

const PPH = 42; // pixels per hour
const SVG_H = 84;
const TICK_H = 22;
const CURSOR_H_OFFSET = 2; // cursor at 2*PPH px from left of view

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, abl = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bbl = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(abl + (bbl - abl) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function scoreToColor(s: number): string {
  if (s >= 50) return lerpColor('#f3b96b', '#8fc8a3', Math.min(1, (s - 50) / 40));
  return lerpColor('#e88a82', '#f3b96b', Math.max(0, (s - 10) / 40));
}

export interface VerdictTimelineHandle {
  scrollToDay: (date: Date) => void;
}

interface Props {
  scores: number[];
  tideHeights?: number[];
  startEpoch: number;   // epoch ms of index 0 (midnight of first day)
  nowIndex: number;     // index of current hour in the array
  onScrollHour?: (hourIndex: number | null) => void;
  onDayChange?: (date: Date) => void;
}

const VerdictTimeline = forwardRef<VerdictTimelineHandle, Props>(
  ({ scores, tideHeights, startEpoch, nowIndex, onScrollHour, onDayChange }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const ignoreScrollUntil = useRef(0);
    const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const totalHours = scores.length;
    const contentWidth = totalHours * PPH;
    const cursorX = CURSOR_H_OFFSET * PPH;
    const initialScrollX = Math.max(0, (nowIndex - CURSOR_H_OFFSET) * PPH);

    useImperativeHandle(ref, () => ({
      scrollToDay: (date: Date) => {
        ignoreScrollUntil.current = Date.now() + 400;
        const hourIdx = (date.getTime() - startEpoch) / 3600000;
        const x = Math.max(0, (hourIdx - CURSOR_H_OFFSET) * PPH);
        scrollRef.current?.scrollTo({ x, animated: true });
      },
    }));

    const handleScroll = (scrollX: number) => {
      if (Date.now() < ignoreScrollUntil.current) return;
      const hourIndex = (scrollX + cursorX) / PPH;
      const snapped = Math.round(hourIndex * 2) / 2;
      onScrollHour?.(snapped);
    };

    const handleScrollSettled = (scrollX: number) => {
      if (Date.now() < ignoreScrollUntil.current) return;
      const hourIndex = (scrollX + cursorX) / PPH;
      const d = new Date(startEpoch + hourIndex * 3600000);
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      onDayChange?.(day);
      onScrollHour?.(null);
    };

    // Tide curve
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

    // Build tick labels (6h) and day separators (midnight)
    const ticks: { i: number; label: string }[] = [];
    const daySeps: { i: number; label: string }[] = [];
    for (let i = 0; i <= totalHours; i += 6) {
      const d = new Date(startEpoch + i * 3600000);
      if (i > 0 && d.getHours() === 0) {
        const raw = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        daySeps.push({ i, label: raw.charAt(0).toUpperCase() + raw.slice(1) });
      } else {
        ticks.push({ i, label: `${String(d.getHours()).padStart(2, '0')}h` });
      }
    }

    return (
      <View style={styles.outer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialScrollX, y: 0 }}
          onScroll={e => handleScroll(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          onScrollEndDrag={e => {
            clearTimeout(scrollEndTimer.current);
            const x = e.nativeEvent.contentOffset.x;
            scrollEndTimer.current = setTimeout(() => handleScrollSettled(x), 50);
          }}
          onMomentumScrollEnd={e => {
            clearTimeout(scrollEndTimer.current);
            handleScrollSettled(e.nativeEvent.contentOffset.x);
          }}
          contentContainerStyle={{ width: contentWidth }}
        >
          <View style={{ width: contentWidth, height: SVG_H + TICK_H }}>
            <Svg width={contentWidth} height={SVG_H}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                  {scores.map((score, i) => (
                    <Stop
                      key={i}
                      offset={`${((i + 0.5) / totalHours * 100).toFixed(2)}%`}
                      stopColor={scoreToColor(score)}
                      stopOpacity={1}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={contentWidth} height={SVG_H} fill="url(#grad)" />
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
              {/* Day separators */}
              {daySeps.map(sep => (
                <Line
                  key={sep.i}
                  x1={sep.i * PPH} y1={0}
                  x2={sep.i * PPH} y2={SVG_H}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.5}
                />
              ))}
              {/* Hour tick marks */}
              {ticks.map(t => (
                <Line
                  key={t.i}
                  x1={t.i * PPH} y1={SVG_H - 10}
                  x2={t.i * PPH} y2={SVG_H}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1}
                />
              ))}
              {/* Now marker: white stripe on top of the current hour bar */}
              <Rect
                x={nowIndex * PPH + 1} y={0}
                width={PPH - 2} height={4}
                fill="rgba(255,255,255,0.75)"
                rx={2}
              />
            </Svg>
            {/* Hour labels */}
            {ticks.map(t => (
              <View key={t.i} style={[styles.tickWrap, { left: t.i * PPH - 14 }]}>
                <Text style={styles.tick}>{t.label}</Text>
              </View>
            ))}
            {/* Day separator labels */}
            {daySeps.map(sep => (
              <View key={sep.i} style={[styles.dayWrap, { left: sep.i * PPH + 4 }]}>
                <Text style={styles.dayLbl}>{sep.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Fixed cursor */}
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
  dayWrap: {
    position: 'absolute',
    top: SVG_H + 4,
    alignItems: 'flex-start',
  },
  dayLbl: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.8)',
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
