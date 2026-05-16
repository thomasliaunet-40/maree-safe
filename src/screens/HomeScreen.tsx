import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TideData, WeatherData, HourlyWeather, VerdictResult, Port, BoatSettings, VerdictLevel } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade from '../components/NavFade';
import { Screen } from '../components/FabNav';
import VerdictTimeline, { VerdictTimelineHandle } from '../components/VerdictTimeline';
import AppLogo from '../components/AppLogo';
import DateStrip from '../components/DateStrip';
import { assessLevel, assessWeatherLevel, assessTideLevel, worstLevel, smoothTideLevels } from '../utils/verdictCalculator';

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
  maxDate: Date;
  isToday: boolean;
  dayVerdicts: Record<string, VerdictLevel>;
  onNav: (s: Screen) => void;
  onRefresh: () => void;
  onSelectDate: (date: Date) => void;
}

const COND_PALETTE = {
  green:  { bg: COLORS.go,   fg: COLORS.goInk },
  orange: { bg: COLORS.warn, fg: '#7a3d18'    },
  red:    { bg: COLORS.stop, fg: '#fff'        },
};

function condLevel(ratio: number, warnRatio: number): keyof typeof COND_PALETTE {
  if (ratio >= 1.0) return 'red';
  if (ratio >= warnRatio) return 'orange';
  return 'green';
}

function ConditionBar({ icon, label, value, sub, ratio, warnRatio }: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  sub: string;
  ratio: number;
  warnRatio: number;
}) {
  const { bg, fg } = COND_PALETTE[condLevel(ratio, warnRatio)];
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

function findTideHeightAtMs(points: TideData['points'], ms: number): number | null {
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(new Date(p.time).getTime() - ms);
    if (diff < bestDiff) { bestDiff = diff; best = p.height; }
  }
  return best;
}

function buildTimelineData(
  startMs: number,
  totalHours: number,
  weatherData: WeatherData,
  tideData: TideData | null,
  boat: BoatSettings
): { scores: number[]; tideHeights: number[] } {
  const tideHeights: number[] = [];
  const rawTideLevels: VerdictLevel[] = [];

  for (let i = 0; i < totalHours; i++) {
    const d = new Date(startMs + i * 3600000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const prefix = `${y}-${m}-${dd}T${hh}`;
    const hourPts = tideData?.points.filter(p => p.time.startsWith(prefix)) ?? [];
    const curveH = hourPts[0]?.height ?? null;
    tideHeights.push(curveH ?? 0);
    rawTideLevels.push(curveH !== null && curveH > 0 ? assessTideLevel(curveH, boat.draft) : 'green');
  }

  const smoothedTide = smoothTideLevels(rawTideLevels);

  const scores: number[] = [];
  for (let i = 0; i < totalHours; i++) {
    const d = new Date(startMs + i * 3600000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const prefix = `${y}-${m}-${dd}T${hh}`;
    const w = weatherData.hourly.find(x => x.time.startsWith(prefix));
    const weatherLvl = w ? assessWeatherLevel(w.windSpeed, w.windGust, w.waveHeight, boat) : 'orange';
    const combined = worstLevel(weatherLvl, smoothedTide[i]);
    scores.push(combined === 'green' ? 90 : combined === 'orange' ? 50 : 10);
  }

  return { scores, tideHeights };
}

const TOTAL_HOURS = 9 * 24; // 216h — 9 jours depuis minuit

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function HomeScreen({
  port, tideData, weatherData, verdict, loading, tideError, weatherError,
  boat, selectedDate, maxDate, isToday, dayVerdicts, onNav, onRefresh, onSelectDate,
}: Props) {
  const nowRef = useRef(new Date());
  const now = nowRef.current;
  const hour = now.getHours();

  const timelineRef = useRef<VerdictTimelineHandle>(null);
  const [scrubHourIndex, setScrubHourIndex] = useState<number | null>(null);
  const isFirstRender = useRef(true);
  const pendingScrollTo = useRef<Date | null>(null);

  // startEpoch = midnight of today; nowIndex = current hour
  const startEpoch = useMemo(() => {
    const m = new Date(now); m.setHours(0, 0, 0, 0); return m.getTime();
  }, []);
  const nowIndex = hour;

  // When chip tapped: record intended scroll target, then delegate up
  const handleChipSelect = (date: Date) => {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    pendingScrollTo.current = isSameDay(date, todayMidnight) ? nowRef.current : date;
    onSelectDate(date);
  };

  // When selectedDate changes: scroll if chip-initiated, skip if scroll-initiated
  useEffect(() => {
    setScrubHourIndex(null);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // contentOffset handles initial position
    }
    if (pendingScrollTo.current) {
      timelineRef.current?.scrollToDay(pendingScrollTo.current);
      pendingScrollTo.current = null;
    }
  }, [selectedDate]);

  // 216h data from midnight today
  const { scores: scores216, tideHeights: tideH216 } = useMemo(() => {
    if (!weatherData) return { scores: Array(TOTAL_HOURS).fill(50), tideHeights: Array(TOTAL_HOURS).fill(0) };
    return buildTimelineData(startEpoch, TOTAL_HOURS, weatherData, tideData, boat);
  }, [weatherData, tideData, boat]);

  // Display time: scrub position or now
  const displayMs = scrubHourIndex !== null
    ? startEpoch + scrubHourIndex * 3600000
    : now.getTime();
  const displayDate = new Date(displayMs);
  const displayHourInt = displayDate.getHours();

  const hourlyW = weatherData
    ? (() => {
        const y = displayDate.getFullYear();
        const m = String(displayDate.getMonth() + 1).padStart(2, '0');
        const d = String(displayDate.getDate()).padStart(2, '0');
        const prefix = `${y}-${m}-${d}T${String(displayHourInt).padStart(2, '0')}`;
        return weatherData.hourly.find(h => h.time.startsWith(prefix)) ?? null;
      })()
    : null;

  const displayWind  = hourlyW?.windSpeed  ?? weatherData?.windSpeed  ?? 0;
  const displayGust  = hourlyW?.windGust   ?? weatherData?.windGust   ?? 0;
  const displayWaveH = hourlyW?.waveHeight ?? weatherData?.waveHeight ?? 0;
  const displayTideH = tideData
    ? (scrubHourIndex !== null
        ? findTideHeightAtMs(tideData.points, displayMs) ?? tideData.currentHeight
        : isToday
          ? tideData.currentHeight
          : findTideHeightAtMs(tideData.points, new Date(selectedDate).setHours(hour, 0, 0, 0)) ?? 0)
    : 0;

  const displayLevel = assessLevel(displayWind, displayGust, displayWaveH, boat, displayTideH > 0 ? displayTideH : undefined);
  const { bg, ink } = levelColor(displayLevel);
  const isScrubbing = scrubHourIndex !== null;

  const dateFmt = selectedDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const dateLabel = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);

  const nextTide = (() => {
    if (!tideData) return null;
    const nowH = hour + now.getMinutes() / 60;
    return tideData.peaks.find(p => {
      const [h, m] = p.time.split('T')[1]?.split(':') ?? ['0', '0'];
      return parseInt(h) + parseInt(m) / 60 > nowH;
    }) ?? tideData.peaks[0] ?? null;
  })();

  const verdictTimeLabel = (() => {
    if (isScrubbing) {
      const mins = displayDate.getMinutes() >= 30 ? '30' : '00';
      const timeStr = `${String(displayHourInt).padStart(2, '0')}h${mins}`;
      const sameDay = displayDate.getDate() === now.getDate() && displayDate.getMonth() === now.getMonth();
      const prefix = sameDay ? 'Auj.' : displayDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      return `${prefix} - ${timeStr}`;
    }
    if (isToday) return `Maintenant · ${String(hour).padStart(2, '0')}h00`;
    return dateLabel;
  })();

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLogoRow}>
          <AppLogo height={55} />
        </View>
        <TouchableOpacity style={styles.portCard} onPress={() => onNav('ports')} activeOpacity={0.7}>
          <Icon name="location" size={16} stroke={COLORS.ink2} />
          <Text style={styles.portName} numberOfLines={1}>{port.name}</Text>
          <Icon name="chevronDown" size={14} stroke={COLORS.ink3} />
        </TouchableOpacity>
        <DateStrip
          selectedDate={isScrubbing ? displayDate : selectedDate}
          maxDate={maxDate}
          verdicts={dayVerdicts}
          onSelect={handleChipSelect}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.brand} />
        }
      >
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
                onPress={() => {
                  setScrubHourIndex(null);
                  pendingScrollTo.current = nowRef.current;
                  onSelectDate(new Date(startEpoch)); // reset to today
                  timelineRef.current?.scrollToDay(nowRef.current);
                }}
                activeOpacity={isScrubbing ? 0.6 : 1}
              >
                <Text style={[styles.verdictTime, { color: ink }]}>{verdictTimeLabel}</Text>
              </TouchableOpacity>
              <Text style={[styles.verdictTitle, { color: ink }]} numberOfLines={1}>
                Conditions de navigation
              </Text>

              {/* Timeline 9j continue */}
              <View style={{ marginTop: 20 }}>
                <VerdictTimeline
                  ref={timelineRef}
                  scores={scores216}
                  tideHeights={tideH216}
                  startEpoch={startEpoch}
                  nowIndex={nowIndex}
                  onScrollHour={setScrubHourIndex}
                  onDayChange={day => { onSelectDate(day); }}
                />
              </View>

              {tideData?.coefficient != null && (
                <Text style={[styles.coefLine, { color: ink }]}>
                  COEFF : {tideData.coefficient}
                </Text>
              )}
            </View>

            {/* Conditions vs seuils */}
            {weatherData && (() => {
              const warnWindRatio  = (boat.warnWind  ?? boat.maxWind  * 0.8) / boat.maxWind;
              const warnWavesRatio = (boat.warnWaves ?? boat.maxWaves * 0.8) / boat.maxWaves;
              const conditions = [
                ...(displayTideH > 0 ? [{ icon: 'anchor' as const, label: "Hauteur d'eau", value: `${displayTideH.toFixed(1)} m`, sub: `TE ${boat.draft} m`, ratio: boat.draft / displayTideH, warnRatio: 1.0 }] : []),
                { icon: 'wind' as const, label: 'Vent',   value: `${Math.round(displayWind)} kn`, sub: `max ${boat.maxWind} kn`,  ratio: displayWind / boat.maxWind,   warnRatio: warnWindRatio },
                { icon: 'wave' as const, label: 'Vagues', value: `${displayWaveH.toFixed(1)} m`,  sub: `max ${boat.maxWaves} m`,  ratio: displayWaveH / boat.maxWaves, warnRatio: warnWavesRatio },
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
  screen:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { paddingTop: 14 },
  topBarLogoRow: { alignItems: 'center', paddingBottom: 12 },
  portCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 22, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: COLORS.paperSoft, borderRadius: 16, borderWidth: 1, borderColor: COLORS.hairline },
  portName:      { fontSize: 17, fontFamily: FONTS.semiBold, color: COLORS.ink },

  scroll:        { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 120 },

  loading:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.ink3 },

  verdictCard:  { borderRadius: 28, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 24, marginBottom: 14 },
  verdictTime:  { fontSize: 20, fontFamily: FONTS.display, letterSpacing: -0.3, opacity: 0.85, marginBottom: 10, textAlign: 'center' },
  verdictTitle: { fontSize: 30, fontFamily: FONTS.display, lineHeight: 34, textAlign: 'center' },
  coefLine:     { fontSize: 26, fontFamily: FONTS.mono, fontWeight: '700', letterSpacing: 0.06, opacity: 0.75, marginTop: 8, textAlign: 'center' },

  condCard:   { backgroundColor: COLORS.paper, borderRadius: 28, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: COLORS.hairline },
  condHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  condTitle:  { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.ink },
  condRows:   { gap: 8 },

  error: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.stop, marginTop: 8, textAlign: 'center' },
});
