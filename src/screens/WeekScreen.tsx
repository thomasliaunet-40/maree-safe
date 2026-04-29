import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { WeatherData, TideData, BoatSettings } from '../types';
import { computeScore } from '../utils/verdictCalculator';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade, { Screen } from '../components/NavFade';

interface Window {
  start: number;
  end: number;
  duration: number;  // heures
  ideal: boolean;    // score >= 65 (vs >= 35 pour "possible")
}

interface DayData {
  date: Date;
  dayLabel: string;
  dateNum: number;
  window: Window | null;
  avgWind: number;
  maxWave: number;
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function findBestWindow(scoreByHour: Record<number, number>, dayStart: number, dayEnd: number): Window | null {
  for (const threshold of [65, 35] as const) {
    let best: { start: number; end: number; len: number } | null = null;
    let i = dayStart;
    while (i <= dayEnd) {
      if ((scoreByHour[i] ?? -1) >= threshold) {
        let j = i;
        while (j <= dayEnd && (scoreByHour[j] ?? -1) >= threshold) j++;
        const len = j - i;
        if (!best || len > best.len) best = { start: i, end: j - 1, len };
        i = j;
      } else i++;
    }
    if (best && best.len >= 1) {
      return { start: best.start, end: best.end, duration: best.len, ideal: threshold === 65 };
    }
  }
  return null;
}

function computeDailyData(weather: WeatherData, boat: BoatSettings, today: Date, tideData: TideData | null): DayData[] {
  const days: DayData[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    const prefix = `${y}-${mo}-${dy}`;

    const hourly = weather.hourly.filter(h => h.time.startsWith(prefix));
    if (hourly.length === 0) continue;

    // Heures de jour réelles (lever/coucher de soleil, fallback 7h–21h)
    const sun = weather.sunriseSunset[prefix];
    const dayStart = sun ? Math.ceil(sun.sunrise) : 7;
    const dayEnd   = sun ? Math.floor(sun.sunset)  : 21;

    // Hauteurs de marée par heure
    const tideByHour: Record<number, number> = {};
    if (tideData) {
      for (const p of tideData.points) {
        if (!p.time.startsWith(prefix)) continue;
        const hr = parseInt(p.time.split('T')[1]?.slice(0, 2) ?? '0', 10);
        tideByHour[hr] = p.height;
      }
    }

    // Score par heure (heures de jour uniquement)
    const scoreByHour: Record<number, number> = {};
    for (const h of hourly) {
      const hr = new Date(h.time).getHours();
      if (hr < dayStart || hr > dayEnd) continue;
      scoreByHour[hr] = computeScore(h.windSpeed, h.windGust, h.waveHeight, boat, tideByHour[hr]);
    }

    const daytimeHourly = hourly.filter(h => {
      const hr = new Date(h.time).getHours();
      return hr >= dayStart && hr <= dayEnd;
    });
    const sample = daytimeHourly.length > 0 ? daytimeHourly : hourly;
    const avgWind = Math.round(sample.reduce((a, h) => a + h.windSpeed, 0) / sample.length);
    const maxWave = Math.max(...sample.map(h => h.waveHeight));

    days.push({
      date,
      dayLabel: DAYS_FR[date.getDay()],
      dateNum: date.getDate(),
      window: findBestWindow(scoreByHour, dayStart, dayEnd),
      avgWind,
      maxWave,
    });
  }
  return days;
}

function dayColor(day: DayData) {
  const w = day.window;
  if (!w) return { bg: COLORS.stop, ink: '#fff', label: 'Impossible' };
  if (w.ideal && w.duration >= 3) return { bg: COLORS.go,   ink: COLORS.goInk, label: 'Bonne journée' };
  if (w.ideal && w.duration >= 1) return { bg: '#d4edaa',   ink: '#3a5a1a',    label: 'Fenêtre courte' };
  if (w.duration >= 3)            return { bg: COLORS.warn,  ink: '#7a3d18',   label: 'Conditions limites' };
  return                               { bg: COLORS.stop,   ink: '#fff',        label: 'Très limité' };
}

interface Props {
  weatherData: WeatherData | null;
  tideData: TideData | null;
  boat: BoatSettings;
  today: Date;
  onNav: (s: Screen) => void;
  onSelectDate: (d: Date) => void;
}

export default function WeekScreen({ weatherData, tideData, boat, today, onNav, onSelectDate }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const days = useMemo(
    () => weatherData ? computeDailyData(weatherData, boat, today, tideData) : [],
    [weatherData, tideData, boat, today]
  );

  if (!weatherData || days.length === 0) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: FONTS.regular, color: COLORS.ink3 }}>Chargement météo 7 jours…</Text>
        <NavFade active="week" onChange={onNav} />
      </View>
    );
  }

  const day = days[selectedIdx];
  const { bg, ink, label } = dayColor(day);

  // Meilleures journées à mettre en avant
  const highlights = days
    .filter(d => d.window?.ideal && d.window.duration >= 1)
    .sort((a, b) => (b.window?.duration ?? 0) - (a.window?.duration ?? 0))
    .slice(0, 3);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => onNav('home')} activeOpacity={0.7}>
          <Icon name="chevronLeft" size={20} stroke={COLORS.ink2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Cette semaine</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Planifier</Text>
        <Text style={styles.subHeading}>
          {today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} → {
            days[days.length - 1]?.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
          }
        </Text>

        {/* Chips 7 jours */}
        <View style={styles.chips}>
          {days.map((d, i) => {
            const c = dayColor(d);
            const sel = i === selectedIdx;
            const dur = d.window?.duration ?? 0;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.chip, { backgroundColor: sel ? COLORS.ink : c.bg }]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipDay, { color: sel ? '#fff' : c.ink }]}>{d.dayLabel}</Text>
                <Text style={[styles.chipDate, { color: sel ? '#fff' : c.ink }]}>{d.dateNum}</Text>
                <Text style={[styles.chipDur, { color: sel ? 'rgba(255,255,255,0.7)' : `${c.ink}99` }]}>
                  {dur > 0 ? `${dur}h` : '—'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Détail du jour sélectionné */}
        <View style={[styles.detailCard, { backgroundColor: bg }]}>
          <Text style={[styles.detailDayLabel, { color: ink }]}>
            {day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={[styles.detailLabel, { color: ink }]}>{label}</Text>

          {day.window ? (
            <View style={[styles.windowBox, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Icon name="check" size={18} stroke={ink} strokeWidth={2.5} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.windowBoxTime, { color: ink }]}>
                  {day.window.start}h00 — {day.window.end + 1}h00
                </Text>
                <Text style={[styles.windowBoxDur, { color: ink }]}>
                  {day.window.duration}h de fenêtre {day.window.ideal ? 'idéale' : 'possible'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.windowBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.windowBoxDur, { color: ink }]}>Aucune fenêtre praticable</Text>
            </View>
          )}

          <View style={[styles.detailGrid, { borderTopColor: 'rgba(0,0,0,0.1)', marginTop: 14 }]}>
            {[
              { label: 'Vent moy.', val: `${day.avgWind}`, unit: 'kn' },
              { label: 'Vagues max', val: `${day.maxWave.toFixed(1)}`, unit: 'm' },
            ].map(({ label: l, val, unit }) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={[styles.detailStatLabel, { color: ink }]}>{l}</Text>
                <Text style={[styles.detailStatVal, { color: ink }]}>
                  {val}<Text style={{ fontSize: 11, opacity: 0.6 }}>{unit}</Text>
                </Text>
              </View>
            ))}
          </View>

          {day.window && (
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => { onSelectDate(day.date); onNav('home'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.goBtnTxt}>Voir le détail →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meilleures journées */}
        {highlights.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Meilleures journées</Text>
            {highlights.map((w, i) => {
              const c = dayColor(w);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.windowCard}
                  onPress={() => { onSelectDate(w.date); onNav('home'); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.windowBadge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.windowBadgeTxt, { color: c.ink }]}>{w.window?.duration}h</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.windowTitle}>
                      {w.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={styles.windowSub}>
                      {w.window ? `${w.window.start}h — ${w.window.end + 1}h` : ''} · {w.avgWind} kn · {w.maxWave.toFixed(1)} m
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={18} stroke={COLORS.ink4} />
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <NavFade active="week" onChange={onNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.paper },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  topTitle:  { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.ink },
  scroll:        { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 120 },
  heading:   { fontSize: 32, fontFamily: FONTS.display, color: COLORS.ink, marginBottom: 4, marginTop: 8, marginHorizontal: 4 },
  subHeading:{ fontSize: 14, fontFamily: FONTS.regular, color: COLORS.ink3, marginBottom: 18, marginHorizontal: 4 },

  chips:    { flexDirection: 'row', gap: 6, marginBottom: 22 },
  chip:     { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  chipDay:  { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase', opacity: 0.7 },
  chipDate: { fontSize: 18, fontFamily: FONTS.display, marginTop: 4, lineHeight: 20 },
  chipDur:  { fontSize: 10, fontFamily: FONTS.semiBold, marginTop: 4 },

  detailCard:     { borderRadius: 28, padding: 22, marginBottom: 22 },
  detailDayLabel: { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase', opacity: 0.65, marginBottom: 6 },
  detailLabel:    { fontSize: 28, fontFamily: FONTS.display, lineHeight: 32, marginBottom: 16 },
  windowBox:      { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  windowBoxTime:  { fontSize: 20, fontFamily: FONTS.display },
  windowBoxDur:   { fontSize: 13, fontFamily: FONTS.regular, opacity: 0.8, marginTop: 2 },
  detailGrid:     { flexDirection: 'row', paddingTop: 14, borderTopWidth: 1 },
  detailStatLabel:{ fontSize: 10, fontFamily: FONTS.semiBold, opacity: 0.6, letterSpacing: 0.1, textTransform: 'uppercase' },
  detailStatVal:  { fontSize: 18, fontFamily: FONTS.display, marginTop: 4 },
  goBtn:          { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' },
  goBtnTxt:       { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.ink },

  sectionLabel:   { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 12 },
  windowCard:     { backgroundColor: COLORS.paper, borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.hairline },
  windowBadge:    { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  windowBadgeTxt: { fontSize: 16, fontFamily: FONTS.display, fontWeight: '600' },
  windowTitle:    { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.ink },
  windowSub:      { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.ink3 },
});
