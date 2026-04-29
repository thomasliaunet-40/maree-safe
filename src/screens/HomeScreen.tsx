import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TideData, WeatherData, HourlyWeather, VerdictResult, Port, BoatSettings } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade from '../components/NavFade';
import { Screen } from '../components/FabNav';
import VerdictTimeline, { VerdictTimelineHandle } from '../components/VerdictTimeline';
import { assessLevel } from '../utils/verdictCalculator';

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
  if (ratio >= 0.67) return 'orange';
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

function levelColor(level: 'green' | 'orange' | 'red') {
  if (level === 'green')  return { bg: COLORS.go,   ink: COLORS.goInk };
  if (level === 'orange') return { bg: COLORS.warn,  ink: '#7a3d18' };
  return                         { bg: COLORS.stop,  ink: '#fff' };
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
    const lvl = w ? assessLevel(w.windSpeed, w.windGust, w.waveHeight, boat, tideH ?? undefined) : 'orange';
    scores.push(lvl === 'green' ? 90 : lvl === 'orange' ? 50 : 10);
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

  // Hauteurs marée heure par heure pour les dates non-aujourd'hui
  const tideH24ForDate = useMemo(() => {
    if (isToday || !tideData) return undefined;
    const base = new Date(selectedDate);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 24 }, (_, i) => {
      const d = new Date(base.getTime() + i * 3600000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const prefix = `${y}-${m}-${dd}T${String(i).padStart(2, '0')}`;
      return tideData.points.find(p => p.time.startsWith(prefix))?.height ?? 0;
    });
  }, [isToday, tideData, selectedDate]);

  // Heure/date affichée selon le scrub
  const displayMs = (() => {
    if (scrubOffset === null) return now.getTime();
    if (isToday) return now.getTime() + scrubOffset * 3600000;
    // Non-aujourd'hui : curseur positionné à Math.min(hour,22)h depuis minuit du jour sélectionné
    const base = new Date(selectedDate); base.setHours(0, 0, 0, 0);
    return base.getTime() + (Math.min(hour, 22) + scrubOffset) * 3600000;
  })();
  const displayDate = new Date(displayMs);
  const displayHourInt = displayDate.getHours();

  // Données météo et marée à l'heure affichée (calculées avant le niveau pour en dépendre)
  const hourlyW = weatherData
    ? (() => {
        const w = weatherData.hourly.find(h => {
          const y = displayDate.getFullYear();
          const m = String(displayDate.getMonth() + 1).padStart(2, '0');
          const d = String(displayDate.getDate()).padStart(2, '0');
          const prefix = `${y}-${m}-${d}T${String(displayHourInt).padStart(2, '0')}`;
          return h.time.startsWith(prefix);
        });
        return w ?? null;
      })()
    : null;
  const displayWind  = hourlyW?.windSpeed  ?? weatherData?.windSpeed  ?? 0;
  const displayGust  = hourlyW?.windGust   ?? weatherData?.windGust   ?? 0;
  const displayWaveH = hourlyW?.waveHeight ?? weatherData?.waveHeight ?? 0;
  const displayTideH = tideData ? (() => {
    if (scrubOffset !== null) return findTideHeight(tideData.points, displayHourInt, displayDate) ?? tideData.currentHeight;
    if (isToday) return tideData.currentHeight;
    return findTideHeight(tideData.points, hour, selectedDate) ?? 0;
  })() : 0;

  const displayLevel = assessLevel(displayWind, displayGust, displayWaveH, boat, displayTideH > 0 ? displayTideH : undefined);
  const { bg, ink } = levelColor(displayLevel);

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
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Icon name="refresh" size={18} stroke={COLORS.ink2} />
        </TouchableOpacity>
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
                  {isScrubbing ? (() => {
                    const mins = displayDate.getMinutes() >= 30 ? '30' : '00';
                    const timeStr = `${String(displayHourInt).padStart(2, '0')}h${mins}`;
                    const isNextDay = displayDate.getDate() !== now.getDate();
                    return isNextDay ? `demain ${timeStr}` : `→ ${timeStr}`;
                  })() : isToday
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
                  tideHeights={isToday ? tideH50 : tideH24ForDate}
                  startEpoch={isToday ? startEpoch : new Date(selectedDate).setHours(0, 0, 0, 0)}
                  cursorHourOffset={isToday ? PAST_HOURS : Math.min(hour, 22)}
                  onOffsetChange={setScrubOffset}
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

            {/* Conditions vs seuils */}
            {weatherData && (() => {
              const conditions = [
                ...(displayTideH > 0 ? [{ icon: 'anchor' as const, label: "Hauteur d'eau", value: `${displayTideH.toFixed(1)} m`, sub: `TE ${boat.draft} m`, ratio: boat.draft / displayTideH }] : []),
                { icon: 'wind' as const, label: 'Vent',   value: `${Math.round(displayWind)} kn`, sub: `max ${boat.maxWind} kn`,  ratio: displayWind / boat.maxWind },
                { icon: 'wave' as const, label: 'Vagues', value: `${displayWaveH.toFixed(1)} m`,  sub: `max ${boat.maxWaves} m`,  ratio: displayWaveH / boat.maxWaves },
              ];
              return (
                <TouchableOpacity style={styles.condCard} onPress={() => onNav('boat')} activeOpacity={0.97}>
                  <View style={styles.condHeader}>
                    <Text style={styles.condTitle}>Conditions vs mes seuils</Text>
                    <Icon name="chevronRight" size={16} stroke={COLORS.ink4} />
                  </View>
                  <View style={styles.condRows}>
                    {conditions.map(c => <ConditionBar key={c.label} {...c} />)}
                  </View>
                </TouchableOpacity>
              );
            })()}

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
  refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14,23,38,0.05)', alignItems: 'center', justifyContent: 'center' },

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
  verdictTime:  { fontSize: 20, fontFamily: FONTS.display, letterSpacing: -0.3, opacity: 0.85, marginBottom: 10, textAlign: 'center' },
  verdictTitle: { fontSize: 30, fontFamily: FONTS.display, lineHeight: 34, textAlign: 'center' },
  coefLine:     { fontSize: 26, fontFamily: FONTS.mono, fontWeight: '700', letterSpacing: 0.06, opacity: 0.75, marginTop: 8, textAlign: 'center' },
  windowRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, padding: 14 },
  windowIcon:   { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  windowLabel:  { fontSize: 12, fontFamily: FONTS.semiBold, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.1 },
  windowTime:   { fontSize: 19, fontFamily: FONTS.semiBold },
  windowDur:    { fontFamily: FONTS.regular, opacity: 0.65 },
  windowSep:    { marginTop: 4 },

  // Conditions card
  condCard:   { backgroundColor: COLORS.paper, borderRadius: 28, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: COLORS.hairline },
  condHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  condTitle:  { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.ink },
  condRows:   { gap: 8 },

  // Action cards
  planCard: { backgroundColor: '#f4c98d', borderRadius: 28, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  planIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#6c9ca0', alignItems: 'center', justifyContent: 'center' },
  planTitle:{ fontSize: 15, fontFamily: FONTS.semiBold, color: '#fff' },
  planSub:  { fontSize: 12, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)' },

  error: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.stop, marginTop: 8, textAlign: 'center' },
});
