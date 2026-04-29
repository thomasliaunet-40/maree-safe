import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { WeatherData, TideData, BoatSettings } from '../types';
import { computeScore, levelFromScore } from '../utils/verdictCalculator';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Icon from '../components/Icon';
import NavFade, { Screen } from '../components/NavFade';

interface DayData {
  date: Date;
  dayLabel: string;
  dateNum: number;
  score: number;     // score minimum des heures de jour (pire moment)
  maxScore: number;  // meilleur score de la journée
  avgWind: number;
  maxWave: number;
  bestWindow: { start: number; end: number } | null;
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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

    // Heures de jour uniquement (7h-21h)
    const daytime = hourly.filter(h => {
      const hr = new Date(h.time).getHours();
      return hr >= 7 && hr <= 21;
    });
    const sample = daytime.length > 0 ? daytime : hourly;

    // Hauteurs de marée par heure pour ce jour
    const tideByHour: Record<number, number> = {};
    if (tideData) {
      for (const p of tideData.points) {
        if (!p.time.startsWith(prefix)) continue;
        const hr = parseInt(p.time.split('T')[1]?.slice(0, 2) ?? '0', 10);
        tideByHour[hr] = p.height;
      }
    }

    const scoreByHour: Record<number, number> = {};
    for (const h of sample) {
      const hr = new Date(h.time).getHours();
      scoreByHour[hr] = computeScore(h.windSpeed, h.windGust, h.waveHeight, boat, tideByHour[hr]);
    }
    const scores = Object.values(scoreByHour);

    // Fenêtre optimale consécutive >= 65
    let best: { start: number; end: number; len: number } | null = null;
    let i = 0;
    while (i < 24) {
      const s = scoreByHour[i];
      if (s !== undefined && s >= 65) {
        let j = i;
        while (j < 24 && (scoreByHour[j] ?? -1) >= 65) j++;
        const len = j - i;
        if (!best || len > best.len) best = { start: i, end: j - 1, len };
        i = j;
      } else i++;
    }

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const avgWind = Math.round(sample.reduce((a, h) => a + h.windSpeed, 0) / sample.length);
    const maxWave = Math.max(...sample.map(h => h.waveHeight));

    days.push({
      date, dayLabel: DAYS_FR[date.getDay()], dateNum: date.getDate(),
      score: minScore, maxScore, avgWind, maxWave,
      bestWindow: best ? { start: best.start, end: best.end } : null,
    });
  }
  return days;
}

function scoreColors(s: number) {
  if (s >= 75) return { bg: COLORS.go,   ink: COLORS.goInk,  label: 'Idéal' };
  if (s >= 55) return { bg: '#d4edaa',   ink: '#3a5a1a',     label: 'Bon' };
  if (s >= 35) return { bg: COLORS.warn,  ink: '#7a3d18',    label: 'Mitigé' };
  return           { bg: COLORS.stop,    ink: '#fff',         label: 'Risqué' };
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
  const { bg, ink, label } = scoreColors(day.score);

  // Meilleures fenêtres globales (filtre sur maxScore pour ne pas exclure les bons jours à marée basse)
  const windows = days
    .filter(d => d.bestWindow && d.maxScore >= 55)
    .sort((a, b) => b.maxScore - a.maxScore)
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
            const c = scoreColors(d.score);
            const sel = i === selectedIdx;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.chip, { backgroundColor: sel ? COLORS.ink : c.bg }]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipDay, { color: sel ? '#fff' : c.ink }]}>{d.dayLabel}</Text>
                <Text style={[styles.chipDate, { color: sel ? '#fff' : c.ink }]}>{d.dateNum}</Text>
                <View style={[styles.chipBar, { backgroundColor: sel ? c.bg : 'rgba(0,0,0,0.15)', width: `${Math.max(20, d.score)}%` as any }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Détail du jour sélectionné */}
        <View style={[styles.detailCard, { backgroundColor: bg }]}>
          <View style={styles.detailTop}>
            <View>
              <Text style={[styles.detailDayLabel, { color: ink }]}>
                {day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={[styles.detailLabel, { color: ink }]}>{label}</Text>
            </View>
            <Text style={[styles.detailScore, { color: ink }]}>{day.score}</Text>
          </View>
          <View style={[styles.detailGrid, { borderTopColor: `rgba(0,0,0,0.1)` }]}>
            {[
              { label: 'Vent moy.', val: `${day.avgWind}`, unit: 'kn' },
              { label: 'Vagues max', val: `${day.maxWave.toFixed(1)}`, unit: 'm' },
              { label: 'Meilleur', val: `${day.maxScore}`, unit: '/100' },
            ].map(({ label: l, val, unit }) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={[styles.detailStatLabel, { color: ink }]}>{l}</Text>
                <Text style={[styles.detailStatVal, { color: ink }]}>
                  {val}<Text style={{ fontSize: 11, opacity: 0.6 }}>{unit}</Text>
                </Text>
              </View>
            ))}
          </View>
          {day.bestWindow && (
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => { onSelectDate(day.date); onNav('home'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.goBtnTxt}>
                Fenêtre {day.bestWindow.start}h–{day.bestWindow.end}h · Voir le détail →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meilleures fenêtres */}
        <Text style={styles.sectionLabel}>Meilleures fenêtres</Text>
        {windows.map((w, i) => {
          const c = scoreColors(w.maxScore);
          return (
            <TouchableOpacity
              key={i}
              style={styles.windowCard}
              onPress={() => { onSelectDate(w.date); onNav('home'); }}
              activeOpacity={0.8}
            >
              <View style={[styles.windowBadge, { backgroundColor: c.bg }]}>
                <Text style={[styles.windowBadgeTxt, { color: c.ink }]}>{w.maxScore}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.windowTitle}>
                  {w.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.windowSub}>
                  {w.bestWindow ? `${w.bestWindow.start}h — ${w.bestWindow.end}h` : ''} · {w.avgWind} kn · {w.maxWave.toFixed(1)} m
                </Text>
              </View>
              <Icon name="chevronRight" size={18} stroke={COLORS.ink4} />
            </TouchableOpacity>
          );
        })}
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

  chips: { flexDirection: 'row', gap: 6, marginBottom: 22 },
  chip:  { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  chipDay: { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase', opacity: 0.7 },
  chipDate:{ fontSize: 18, fontFamily: FONTS.display, marginTop: 4, lineHeight: 20 },
  chipBar: { marginTop: 6, height: 4, borderRadius: 2, alignSelf: 'center' },

  detailCard: { borderRadius: 28, padding: 22, marginBottom: 22 },
  detailTop:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  detailDayLabel:{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.1, textTransform: 'uppercase', opacity: 0.65, marginBottom: 6 },
  detailLabel:   { fontSize: 28, fontFamily: FONTS.display, lineHeight: 30 },
  detailScore:   { fontSize: 44, fontFamily: FONTS.display, lineHeight: 44, opacity: 0.9 },
  detailGrid:    { flexDirection: 'row', paddingTop: 14, borderTopWidth: 1 },
  detailStatLabel:{ fontSize: 10, fontFamily: FONTS.semiBold, opacity: 0.6, letterSpacing: 0.1, textTransform: 'uppercase' },
  detailStatVal:  { fontSize: 18, fontFamily: FONTS.display, marginTop: 4 },
  goBtn:         { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' },
  goBtnTxt:      { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.ink },

  sectionLabel:  { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.12, marginBottom: 12 },
  windowCard:    { backgroundColor: COLORS.paper, borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.hairline },
  windowBadge:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  windowBadgeTxt:{ fontSize: 16, fontFamily: FONTS.display, fontWeight: '600' },
  windowTitle:   { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.ink },
  windowSub:     { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.ink3 },
});
