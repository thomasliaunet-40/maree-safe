import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TideData, WeatherData, HourlyWeather, VerdictResult, Port, BoatSettings } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { degreesToCompass } from '../utils/windDirection';
import Icon from '../components/Icon';
import NavFade from '../components/NavFade';
import { Screen } from '../components/FabNav';
import VerdictTimeline, { VerdictTimelineHandle } from '../components/VerdictTimeline';
import Compass from '../components/Compass';
import { computeScore } from '../utils/verdictCalculator';

interface Props {
  port: Port;
  tideData: TideData | null;
  weatherData: WeatherData | null;
  verdict: VerdictResult | null;
  loading: boolean;
  tideError: string | null;
  weatherError: string | null;
  boat: BoatSettings;
  selectedDate: Date;
  isToday: boolean;
  onNav: (s: Screen) => void;
  onRefresh: () => void;
}

const COND_PALETTE = {
  green:  { bg: COLORS.go,   fg: COLORS.goInk },
  orange: { bg: COLORS.warn, fg: '#7a3d18'    },
  red:    { bg: COLORS.stop, fg: '#fff'        },
};

function condLevel(ratio: number): keyof typeof COND_PALETTE {
  if (ratio >= 1.0) return 'red';
  if (ratio >= 0.75) return 'orange';
  return 'green';
}

function ConditionBar({ icon, label, value, sub, ratio }: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  sub: string;
  ratio: number;
}) {
  const { bg, fg } = COND_PALETTE[condLevel(ratio)];
  const fill = Math.min(ratio, 1);
  return (
    <View style={[barStyles.card, { backgroundColor: bg }]}>
      <View style={barStyles.top}>
        <View style={barStyles.labelRow}>
          <Icon name={icon} size={14} stroke={fg} />
          <Text style={[barStyles.label, { color: fg }]}>{label}</Text>
        </View>
        <View style={barStyles.valueRow}>
          <Text style={[barStyles.value, { color: fg }]}>{value}</Text>
          <Text style={[barStyles.sub, { color: fg }]}> / {sub}</Text>
        </View>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${fill * 100}%` }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  card:     { borderRadius: 18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label:    { fontSize: 13, fontFamily: FONTS.semiBold },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value:    { fontSize: 15, fontFamily: FONTS.display },
  sub:      { fontSize: 11, fontFamily: FONTS.regular, opacity: 0.65 },
  track:    { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.12)', overflow: 'hidden' },
  fill:     { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.28)' },
});

function scoreColor(s: number) {
  if (s >= 75) return { bg: COLORS.go,    ink: COLORS.goInk };
  if (s >= 55) return { bg: '#d4edaa',    ink: '#3a5a1a' };
  if (s >= 35) return { bg: COLORS.warn,  ink: '#7a3d18' };
  return           { bg: COLORS.stop,     ink: '#fff' };
}

function findHourlyWeather(hourly: HourlyWeather[], hour: number, date: Date): HourlyWeather | null {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `${y}-${m}-${d}T${String(hour).padStart(2, '0')}`;
  return hourly.find(h => h.time.startsWith(prefix)) ?? null;
}


function findTideHeight(points: TideData['points'], hour: number, date: Date): number | null {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `${y}-${m}-${d}T${String(hour).padStart(2, '0')}`;
  return points.find(p => p.time.startsWith(prefix))?.height ?? null;
}

// Calcule scores + hauteurs marée sur une fenêtre de N heures à partir d'un timestamp
function buildTimelineData(
  startMs: number,
  totalHours: number,
  weatherData: WeatherData,
  tideData: TideData | null,
  boat: BoatSettings
): { scores: number[]; tideHeights: number[] } {
  const scores: number[] = [];
  const tideHeights: number[] = [];
  for (let i = 0; i < totalHours; i++) {
    const d = new Date(startMs + i * 3600000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const prefix = `${y}-${m}-${dd}T${hh}`;
    const w = weatherData.hourly.find(x => x.time.startsWith(prefix));
    const tp = tideData?.points.find(p => p.time.startsWith(prefix));
    const tideH = tp?.height ?? null;
    scores.push(w ? computeScore(w.windSpeed, w.windGust, w.waveHeight, boat, tideH ?? undefined) : 50);
    tideHeights.push(tideH ?? 0);
  }
  return { scores, tideHeights };
}

const PAST_HOURS = 2;
const FUTURE_HOURS = 48;
const TOTAL_HOURS = PAST_HOURS + FUTURE_HOURS;

export default function HomeScreen({
  port, tideData, weatherData, verdict, loading, tideError, weatherError,
  boat, selectedDate, isToday, onNav, onRefresh,
}: Props) {
  const nowRef = useRef(new Date());
  const now = nowRef.current;
  const hour = now.getHours();

  const timelineRef = useRef<VerdictTimelineHandle>(null);
  // scrubOffset : décalage en heures depuis "maintenant" (null = maintenant)
  const [scrubOffset, setScrubOffset] = useState<number | null>(null);

  useEffect(() => {
    setScrubOffset(null);
    timelineRef.current?.scrollToNow();
  }, [selectedDate]);

  // Timestamp de début de la fenêtre timeline (-2h)
  const startEpoch = useMemo(() => now.getTime() - PAST_HOURS * 3600000, []);

  // Données 50h calculées depuis weatherData
  const { scores: scores50h, tideHeights: tideH50 } = useMemo(() => {
    if (!weatherData) return { scores: Array(TOTAL_HOURS).fill(50), tideHeights: Array(TOTAL_HOURS).fill(0) };
    return buildTimelineData(startEpoch, TOTAL_HOURS, weatherData, tideData, boat);
  }, [weatherData, tideData, boat]);

  // Heure/date affichée selon le scrub
  const displayMs = scrubOffset !== null ? now.getTime() + scrubOffset * 3600000 : now.getTime();
  const displayDate = new Date(displayMs);
  const displayHourInt = displayDate.getHours();

  const displayScoreIdx = Math.max(0, Math.min(TOTAL_HOURS - 1, Math.round((scrubOffset ?? 0) + PAST_HOURS)));
  const displayScore = scrubOffset !== null
    ? (scores50h[displayScoreIdx] ?? 50)
    : (verdict?.hourlyScores[hour] ?? verdict?.score ?? 0);
  const { bg, ink } = scoreColor(displayScore);

  // Données météo et marée à l'heure affichée
  const hourlyW = scrubOffset !== null && weatherData
    ? findHourlyWeather(weatherData.hourly, displayHourInt, displayDate)
    : null;
  const displayWind  = hourlyW?.windSpeed  ?? weatherData?.windSpeed  ?? 0;
  const displayGust  = hourlyW?.windGust   ?? weatherData?.windGust   ?? 0;
  const displayWaveH = hourlyW?.waveHeight ?? weatherData?.waveHeight ?? 0;
  const displayTideH = scrubOffset !== null && tideData
    ? (findTideHeight(tideData.points, displayHourInt, displayDate) ?? tideData.currentHeight)
    : tideData?.currentHeight ?? 0;

  const isScrubbing = scrubOffset !== null;

  const nextTide = (() => {
    if (!tideData) return null;
    const nowH = hour + now.getMinutes() / 60;
    return tideData.peaks.find(p => {
      const [h, m] = p.time.split('T')[1]?.split(':') ?? ['0', '0'];
      return parseInt(h) + parseInt(m) / 60 > nowH;
    }) ?? tideData.peaks[0] ?? null;
  })();

  const dateFmt = selectedDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const dateLabel = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.portBtn} onPress={() => onNav('ports')} activeOpacity={0.7}>
          <Icon name="location" size={16} stroke={COLORS.ink2} />
          <Text style={styles.portName}>{port.name}</Text>
          <Icon name="chevronDown" size={14} stroke={COLORS.ink3} />
        </TouchableOpacity>
        <View style={styles.bellBtn}>
          <Icon name="bell" size={18} stroke={COLORS.ink2} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.brand} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingDate}>{dateLabel}</Text>
          <Text style={styles.greetingTitle}>
            {'Bonjour Marin,\n'}
            <Text style={styles.greetingMuted}></Text>
          </Text>
        </View>

        {loading && !verdict ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.brand} />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        ) : verdict ? (
          <>
            {/* Verdict card */}
            <View style={[styles.verdictCard, { backgroundColor: bg }]}>
              <TouchableOpacity
                onPress={() => { setScrubOffset(null); timelineRef.current?.scrollToNow(); }}
                activeOpacity={isScrubbing ? 0.6 : 1}
              >
                <Text style={[styles.verdictTime, { color: ink }]}>
                  {isScrubbing
                    ? `→ ${String(displayHourInt).padStart(2, '0')}h${displayDate.getMinutes() >= 30 ? '30' : '00'}`
                    : isToday
                    ? `Maintenant · ${String(hour).padStart(2, '0')}h00`
                    : dateLabel}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.verdictTitle, { color: ink }]} numberOfLines={1}>
                Conditions de navigation
              </Text>

              {/* Timeline */}
              <View style={{ marginTop: 20 }}>
                <VerdictTimeline
                  ref={timelineRef}
                  scores={isToday ? scores50h : verdict.hourlyScores}
                  tideHeights={isToday ? tideH50 : undefined}
                  startEpoch={isToday ? startEpoch : new Date(selectedDate).setHours(0, 0, 0, 0)}
                  cursorHourOffset={isToday ? PAST_HOURS : Math.min(hour, 22)}
                  onOffsetChange={isToday ? setScrubOffset : undefined}
                />
              </View>

              {/* Coefficient de l'étale suivante */}
              {tideData?.coefficient != null && (
                <Text style={[styles.coefLine, { color: ink }]}>
                  COEFF : {tideData.coefficient}
                </Text>
              )}

              {/* Fenêtres optimales — uniquement celles qui ne sont pas passées */}
              {(() => {
                const windows = isToday
                  ? verdict.recommendedWindows.filter(w => w.end >= hour)
                  : verdict.recommendedWindows;

                return windows.length > 0 ? (
                <View style={styles.windowRow}>
                  <View style={[styles.windowIcon, { backgroundColor: `${ink}CC` }]}>
                    <Icon name="check" size={18} stroke="#fff" strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.windowLabel, { color: ink }]}>
                      {windows.length > 1 ? 'FENÊTRES OPTIMALES' : 'FENÊTRE OPTIMALE'}
                    </Text>
                    {windows.map((w, i) => (
                      <View key={i} style={i > 0 ? styles.windowSep : undefined}>
                        <Text style={[styles.windowTime, { color: ink }]}>
                          {w.start}h00 — {w.end + 1}h00
                          <Text style={[styles.windowDur, { color: ink }]}>
                            {' '}· {w.end - w.start + 1}h
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null; })()}
            </View>

            {/* Conditions vs seuils — barres pleine largeur, triées par sévérité */}
            {weatherData && (() => {
              const conditions = [
                { icon: 'wind'   as const, label: 'Vent',         value: `${Math.round(displayWind)} kn`,    sub: `max ${boat.maxWind} kn`,   ratio: displayWind / boat.maxWind },
                { icon: 'wave'   as const, label: 'Vagues',       value: `${displayWaveH.toFixed(1)} m`,     sub: `max ${boat.maxWaves} m`,   ratio: displayWaveH / boat.maxWaves },
                ...(displayTideH > 0 ? [{ icon: 'anchor' as const, label: "Hauteur d'eau", value: `${displayTideH.toFixed(1)} m`, sub: `TE ${boat.draft} m`, ratio: boat.draft / displayTideH }] : []),
              ].sort((a, b) => b.ratio - a.ratio);
              return (
                <TouchableOpacity style={styles.condCard} onPress={() => onNav('boat')} activeOpacity={0.97}>
                  <View style={styles.condHeader}>
                    <Text style={styles.condTitle}>Conditions vs mes seuils</Text>
                    <Icon name="chevronRight" size={16} stroke={COLORS.ink4} />
                  </View>
                  <View style={styles.condRows}>
                    {conditions.map(c => (
                      <ConditionBar key={c.label} {...c} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* 3 KPI cards */}
            {weatherData && (
              <View style={styles.kpiRow}>
                {/* Marée */}
                <TouchableOpacity style={[styles.kpiCard, styles.kpiTide]} onPress={() => onNav('tide')} activeOpacity={0.85}>
                  <View style={styles.kpiHeader}>
                    <Icon name="wave" size={18} stroke={COLORS.tideInk} />
                    <Text style={[styles.kpiTag, { color: COLORS.tideInk }]}>
                      {nextTide?.type === 'high' ? 'Pleine mer' : 'Basse mer'}
                    </Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: COLORS.tideInk }]}>
                    {nextTide?.height.toFixed(1) ?? '—'}
                    <Text style={styles.kpiUnit}>m</Text>
                  </Text>
                  <Text style={[styles.kpiSub, { color: COLORS.tideInk }]}>
                    {nextTide ? `à ${nextTide.time.split('T')[1]?.slice(0, 5)}` : ''}
                  </Text>
                </TouchableOpacity>

                {/* Vent */}
                <View style={[styles.kpiCard, styles.kpiSand]}>
                  <View style={styles.kpiHeader}>
                    <Icon name="wind" size={18} stroke={COLORS.sandInk} />
                    <Text style={[styles.kpiTag, { color: COLORS.sandInk }]}>
                      Vent {degreesToCompass(weatherData.windDirection)}
                    </Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: COLORS.sandInk }]}>
                    {Math.round(weatherData.windSpeed)}
                    <Text style={styles.kpiUnit}>kn</Text>
                  </Text>
                  <Text style={[styles.kpiSub, { color: COLORS.sandInk }]}>
                    raf. {Math.round(weatherData.windGust)} kn
                  </Text>
                </View>

                {/* Coef */}
                <TouchableOpacity style={[styles.kpiCard, styles.kpiLilac]} onPress={() => onNav('tide')} activeOpacity={0.85}>
                  <View style={styles.kpiHeader}>
                    <Icon name="anchor" size={18} stroke={COLORS.lilacInk} />
                    <Text style={[styles.kpiTag, { color: COLORS.lilacInk }]}>Coef.</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: COLORS.lilacInk }]}>
                    {tideData?.coefficient ?? '—'}
                  </Text>
                  <Text style={[styles.kpiSub, { color: COLORS.lilacInk }]}>
                    {(tideData?.coefficient ?? 0) >= 95 ? 'grandes vives-eaux'
                      : (tideData?.coefficient ?? 0) >= 70 ? 'vives-eaux' : 'mortes-eaux'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* État de la mer */}
            {weatherData && (
              <View style={styles.seaCard}>
                <View style={styles.seaTop}>
                  <View>
                    <Text style={styles.seaTag}>État de la mer</Text>
                    <Text style={styles.seaLabel}>
                      {weatherData.waveHeight > 2.5 ? 'Mer agitée'
                        : weatherData.waveHeight > 1.5 ? 'Mer formée'
                        : weatherData.waveHeight > 0.5 ? 'Belle mer'
                        : 'Mer calme'}
                    </Text>
                  </View>
                  <Compass deg={weatherData.windDirection} size={56} color="#fff" bg="rgba(255,255,255,0.12)" />
                </View>
                <View style={styles.seaGrid}>
                  <View>
                    <Text style={styles.seaStatLabel}>Vagues</Text>
                    <Text style={styles.seaStatValue}>
                      {weatherData.waveHeight.toFixed(1)}<Text style={styles.seaStatUnit}>m</Text>
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.seaStatLabel}>Rafales</Text>
                    <Text style={styles.seaStatValue}>
                      {Math.round(weatherData.windGust)}<Text style={styles.seaStatUnit}>kn</Text>
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.seaStatLabel}>Direction</Text>
                    <Text style={styles.seaStatValue}>
                      {degreesToCompass(weatherData.windDirection)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action cards */}
            <TouchableOpacity style={styles.planCard} onPress={() => onNav('week')} activeOpacity={0.85}>
              <View style={styles.planIcon}>
                <Icon name="calendar" size={20} stroke="#fff" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>Planifier ma semaine</Text>
                <Text style={styles.planSub}>Vue 7 jours · fenêtres détectées</Text>
              </View>
              <Icon name="chevronRight" size={18} stroke="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.boatCard} onPress={() => onNav('boat')} activeOpacity={0.85}>
              <View style={styles.boatIcon}>
                <Icon name="boat" size={18} stroke={COLORS.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boatTitle}>{boat.name}</Text>
                <Text style={styles.boatSub}>Seuils : {boat.maxWind} kn · {boat.maxWaves} m</Text>
              </View>
              <Icon name="chevronRight" size={18} stroke={COLORS.ink4} />
            </TouchableOpacity>

            {/* Erreurs */}
            {tideError && <Text style={styles.error}>{tideError}</Text>}
            {weatherError && <Text style={styles.error}>{weatherError}</Text>}
          </>
        ) : null}
      </ScrollView>

      <NavFade active="home" onChange={onNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: COLORS.bg },
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6 },
  portBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portName: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  bellBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14,23,38,0.05)', alignItems: 'center', justifyContent: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 120 },

  greeting:     { paddingHorizontal: 4, paddingBottom: 18 },
  greetingDate: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 1 },
  greetingTitle:{ fontSize: 34, fontFamily: FONTS.display, letterSpacing: -0.5, marginTop: 6, color: COLORS.ink, lineHeight: 40 },
  greetingMuted:{ color: COLORS.ink3 },

  loading:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.ink3 },

  // Verdict
  verdictCard:  { borderRadius: 28, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 24, marginBottom: 14 },
  verdictTime:  { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 0.14, textTransform: 'uppercase', opacity: 0.7, marginBottom: 10, textAlign: 'center' },
  verdictTitle: { fontSize: 30, fontFamily: FONTS.display, lineHeight: 34, textAlign: 'center' },
  coefLine:     { fontSize: 11, fontFamily: FONTS.mono, fontWeight: '700', letterSpacing: 0.06, opacity: 0.75, marginTop: 8, textAlign: 'center' },
  windowRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, padding: 14 },
  windowIcon:   { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  windowLabel:  { fontSize: 12, fontFamily: FONTS.semiBold, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.1 },
  windowTime:   { fontSize: 19, fontFamily: FONTS.semiBold },
  windowDur:    { fontFamily: FONTS.regular, opacity: 0.65 },
  windowSep:    { marginTop: 4 },

  // Conditions vs seuils
  condCard:   { backgroundColor: COLORS.paper, borderRadius: 28, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.hairline },
  condHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  condTitle:  { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.12, textTransform: 'uppercase', color: COLORS.ink3 },
  condRows:   { gap: 6 },

  // KPI row
  kpiRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, borderRadius: 28, padding: 16 },
  kpiTide: { backgroundColor: COLORS.tide },
  kpiSand: { backgroundColor: COLORS.sand },
  kpiLilac:{ backgroundColor: COLORS.lilac },
  kpiHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  kpiTag:  { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase', opacity: 0.6 },
  kpiValue:{ fontSize: 26, fontFamily: FONTS.display, lineHeight: 28 },
  kpiUnit: { fontSize: 13, opacity: 0.6 },
  kpiSub:  { fontSize: 11, fontFamily: FONTS.regular, opacity: 0.7, marginTop: 4 },

  // État de la mer
  seaCard:     { backgroundColor: COLORS.ink, borderRadius: 28, padding: 18, marginBottom: 14 },
  seaTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  seaTag:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.semiBold, letterSpacing: 0.12, textTransform: 'uppercase' },
  seaLabel:    { fontSize: 24, fontFamily: FONTS.display, color: '#fff', marginTop: 6 },
  seaGrid:     { flexDirection: 'row', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  seaStatLabel:{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.semiBold, letterSpacing: 0.1, textTransform: 'uppercase', flex: 1 },
  seaStatValue:{ fontSize: 19, fontFamily: FONTS.display, color: '#fff', marginTop: 4 },
  seaStatUnit: { fontSize: 11, opacity: 0.6 },

  // Action cards
  planCard: { backgroundColor: '#f4c98d', borderRadius: 28, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  planIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#6c9ca0', alignItems: 'center', justifyContent: 'center' },
  planTitle:{ fontSize: 15, fontFamily: FONTS.semiBold, color: '#fff' },
  planSub:  { fontSize: 12, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)' },

  boatCard: { backgroundColor: COLORS.paper, borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: COLORS.hairline },
  boatIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.paperSoft, alignItems: 'center', justifyContent: 'center' },
  boatTitle:{ fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  boatSub:  { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.ink3 },

  error: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.stop, marginTop: 8, textAlign: 'center' },
});
