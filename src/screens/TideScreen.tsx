import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, PanResponder, LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TideData, TidePoint } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade, { Screen } from '../components/NavFade';

interface Props {
  tideData: TideData | null;
  selectedDate: Date;
  onNav: (s: Screen) => void;
}

function interpolateHeight(points: TidePoint[], hour: number): number {
  const t = new Date(points[0]?.time ?? '').toISOString().slice(0, 10);
  const ordered = [...points].sort((a, b) => a.time.localeCompare(b.time));
  const target = hour * 60;

  for (let i = 0; i < ordered.length - 1; i++) {
    const tA = new Date(ordered[i].time);
    const tB = new Date(ordered[i + 1].time);
    const mA = tA.getHours() * 60 + tA.getMinutes();
    const mB = tB.getHours() * 60 + tB.getMinutes();
    if (target >= mA && target <= mB) {
      const ratio = (target - mA) / (mB - mA || 1);
      return ordered[i].height + (ordered[i + 1].height - ordered[i].height) * ratio;
    }
  }
  return ordered[ordered.length - 1]?.height ?? 0;
}

export default function TideScreen({ tideData, selectedDate, onNav }: Props) {
  const [scrubHour, setScrubHour] = useState(new Date().getHours() + new Date().getMinutes() / 60);
  const [svgWidth, setSvgWidth] = useState(320);
  const SVG_H = 200;
  const PAD_L = 8, PAD_R = 8, PAD_T = 14, PAD_B = 28;

  const allPoints = tideData?.points ?? [];
  const points = allPoints.filter(p => {
    const d = new Date(p.time);
    return d.getFullYear() === selectedDate.getFullYear() &&
           d.getMonth()    === selectedDate.getMonth()    &&
           d.getDate()     === selectedDate.getDate();
  });
  const heights = points.map(p => p.height);
  const minH = heights.length ? Math.min(...heights) : 0;
  const maxH = heights.length ? Math.max(...heights) : 6;
  const range = maxH - minH || 1;

  const sx = (h: number) => PAD_L + (h / 24) * (svgWidth - PAD_L - PAD_R);
  const sy = (m: number) => PAD_T + (1 - (m - minH) / range) * (SVG_H - PAD_T - PAD_B);

  const ptCoords = points.map(p => {
    const d = new Date(p.time);
    const h = d.getHours() + d.getMinutes() / 60;
    return { x: sx(h), y: sy(p.height) };
  });

  const pathD = ptCoords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${sx(24).toFixed(1)} ${sy(minH).toFixed(1)} L${sx(0).toFixed(1)} ${sy(minH).toFixed(1)} Z`;

  const currentH = interpolateHeight(points, scrubHour);
  const scrubX = sx(scrubHour);
  const scrubY = sy(currentH);

  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        setSvgWidth(w => {
          const usable = w - PAD_L - PAD_R;
          const relX = gs.moveX - PAD_L;
          const hour = Math.max(0, Math.min(24, (relX / usable) * 24));
          setScrubHour(hour);
          return w;
        });
      },
    })
  ).current;

  const onSvgLayout = (e: LayoutChangeEvent) => setSvgWidth(e.nativeEvent.layout.width);

  const dateFmt = selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNav('home')} activeOpacity={0.7}>
          <Icon name="chevronLeft" size={20} stroke={COLORS.ink2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Marée du jour</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Hauteur d'eau</Text>
        <Text style={styles.subHeading}>{dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1)}</Text>

        {/* Scrub card */}
        <View style={styles.scrubCard}>
          <View style={styles.scrubTop}>
            <View>
              <Text style={styles.scrubTime}>À {fmtH(scrubHour)}</Text>
              <Text style={styles.scrubHeight}>
                {currentH.toFixed(2)}
                <Text style={styles.scrubUnit}> m</Text>
              </Text>
            </View>
            {tideData && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.scrubCoefLabel}>Coefficient</Text>
                <Text style={styles.scrubCoef}>{tideData.coefficient}</Text>
              </View>
            )}
          </View>

          {/* Courbe SVG */}
          <View onLayout={onSvgLayout} style={styles.svgWrap} {...panResponder.panHandlers}>
            {points.length > 0 ? (
              <Svg width="100%" height={SVG_H} viewBox={`0 0 ${svgWidth} ${SVG_H}`}>
                <Defs>
                  <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={COLORS.tideDeep} stopOpacity="0.3" />
                    <Stop offset="100%" stopColor={COLORS.tideDeep} stopOpacity="0.05" />
                  </LinearGradient>
                </Defs>
                {/* Grille */}
                {[1, 2, 3, 4, 5].map(m => (
                  m >= minH && m <= maxH ? (
                    <Line key={m} x1={PAD_L} y1={sy(m)} x2={svgWidth - PAD_R} y2={sy(m)}
                      stroke="rgba(26,58,85,0.1)" strokeDasharray="2 3" />
                  ) : null
                ))}
                <Path d={areaD} fill="url(#tideGrad)" />
                <Path d={pathD} fill="none" stroke={COLORS.tideInk} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

                {/* PM / BM */}
                {tideData?.peaks.map((pk, i) => {
                  const d = new Date(pk.time);
                  const h = d.getHours() + d.getMinutes() / 60;
                  return (
                    <React.Fragment key={i}>
                      <Circle cx={sx(h)} cy={sy(pk.height)} r={4} fill={COLORS.tideInk} />
                      <SvgText x={sx(h)} y={sy(pk.height) - 10} textAnchor="middle"
                        fontSize={10} fill={COLORS.tideInk} fontWeight="700">{pk.label}</SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Scrub */}
                <Line x1={scrubX} y1={PAD_T - 4} x2={scrubX} y2={SVG_H - PAD_B + 4}
                  stroke={COLORS.ink} strokeWidth={1.5} />
                <Circle cx={scrubX} cy={scrubY} r={6} fill={COLORS.ink} />
                <Circle cx={scrubX} cy={scrubY} r={9} fill="none" stroke={COLORS.ink} strokeWidth={1.5} opacity={0.3} />

                {/* Ticks X */}
                {[0, 6, 12, 18, 24].map(h => (
                  <SvgText key={h} x={sx(h)} y={SVG_H - 10} textAnchor="middle"
                    fontSize={9} fill="rgba(26,58,85,0.6)">{h}h</SvgText>
                ))}
              </Svg>
            ) : (
              <View style={{ height: SVG_H, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONTS.regular, color: COLORS.ink3 }}>Données non disponibles</Text>
              </View>
            )}
          </View>
          <Text style={styles.scrubHint}>Faites glisser pour explorer l'heure</Text>
        </View>

        {/* PM / BM grid */}
        {tideData && (
          <>
            <Text style={styles.sectionLabel}>Marées du jour</Text>
            <View style={styles.peakGrid}>
              {tideData.peaks.map((pk, i) => (
                <View key={i} style={styles.peakCard}>
                  <View style={styles.peakTop}>
                    <Icon
                      name={pk.type === 'high' ? 'arrowUp' : 'arrowDown'}
                      size={14}
                      stroke={pk.type === 'high' ? COLORS.goDeep : COLORS.stopDeep}
                      strokeWidth={2.4}
                    />
                    <Text style={[styles.peakTypeLabel, { color: pk.type === 'high' ? COLORS.goDeep : COLORS.stopDeep }]}>
                      {pk.label === 'PM' ? 'Pleine mer' : 'Basse mer'}
                    </Text>
                  </View>
                  <Text style={styles.peakTime}>{pk.time.split('T')[1]?.slice(0, 5)}</Text>
                  <Text style={styles.peakHeight}>{pk.height.toFixed(2)} m</Text>
                </View>
              ))}
            </View>

            {/* Coef explainer */}
            <View style={styles.coefCard}>
              <View style={styles.coefHeader}>
                <Icon name="info" size={16} stroke={COLORS.lilacInk} />
                <Text style={styles.coefTag}>
                  {tideData.coefficient >= 95 ? 'Grandes vives-eaux'
                    : tideData.coefficient >= 70 ? 'Vives-eaux' : 'Mortes-eaux'}
                </Text>
              </View>
              <Text style={styles.coefText}>
                Coefficient {tideData.coefficient} : marnage{' '}
                {tideData.coefficient >= 95 ? 'exceptionnel' : tideData.coefficient >= 70 ? 'important' : 'faible'}.
                {tideData.coefficient >= 70
                  ? ' Courants forts en sortie de port, à prendre en compte pour les manœuvres.'
                  : ' Faible amplitude, courants modérés.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <NavFade active="tide" onChange={onNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.paper },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  topTitle:  { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  scroll:        { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 120 },
  heading:   { fontSize: 32, fontFamily: FONTS.display, color: COLORS.ink, marginTop: 8, marginHorizontal: 4, marginBottom: 4 },
  subHeading:{ fontSize: 12, fontFamily: FONTS.medium, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 18, marginHorizontal: 4 },

  scrubCard: { backgroundColor: COLORS.tide, borderRadius: 28, padding: 18, marginBottom: 22 },
  scrubTop:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  scrubTime: { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.12, textTransform: 'uppercase', color: COLORS.tideInk, opacity: 0.7 },
  scrubHeight:{ fontSize: 48, fontFamily: FONTS.display, color: COLORS.tideInk, lineHeight: 52 },
  scrubUnit: { fontSize: 18, opacity: 0.6 },
  scrubCoefLabel:{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.12, textTransform: 'uppercase', color: COLORS.tideInk, opacity: 0.65 },
  scrubCoef: { fontSize: 28, fontFamily: FONTS.display, color: COLORS.tideInk, marginTop: 4 },
  svgWrap:   { width: '100%', overflow: 'hidden' },
  scrubHint: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.tideInk, opacity: 0.55, textAlign: 'center', marginTop: 6 },

  sectionLabel: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 12 },

  peakGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  peakCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.paper, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORS.hairline },
  peakTop:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  peakTypeLabel:{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase' },
  peakTime: { fontSize: 22, fontFamily: FONTS.display, color: COLORS.ink, lineHeight: 24 },
  peakHeight:{ fontSize: 13, fontFamily: FONTS.regular, color: COLORS.ink3, marginTop: 4 },

  coefCard:   { backgroundColor: COLORS.lilac, borderRadius: 20, padding: 18 },
  coefHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  coefTag:    { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.12, textTransform: 'uppercase', color: COLORS.lilacInk },
  coefText:   { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.lilacInk, lineHeight: 20 },
});
