import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { WeatherData, HourlyWeather, BoatSettings, Port, VerdictLevel } from '../types';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { degreesToCompass, beaufortScale } from '../utils/windDirection';
import { Screen } from '../components/FabNav';
import Icon from '../components/Icon';
import Compass from '../components/Compass';
import AppLogo from '../components/AppLogo';
import DateStrip from '../components/DateStrip';

interface Props {
  weatherData: WeatherData | null;
  selectedDate: Date;
  maxDate: Date;
  dayVerdicts: Record<string, VerdictLevel>;
  onSelectDate: (date: Date) => void;
  port: Port;
  boat: BoatSettings;
  onNav: (s: Screen) => void;
}

const DAY_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function windLevel(knots: number, warn: number, max: number): 'green' | 'orange' | 'red' {
  if (knots >= max) return 'red';
  if (knots >= warn) return 'orange';
  return 'green';
}

function windColor(knots: number, warn: number, max: number): string {
  const lvl = windLevel(knots, warn, max);
  return lvl === 'red' ? COLORS.stop : lvl === 'orange' ? COLORS.warn : COLORS.go;
}

const BEAUFORT_DESC: Record<number, string> = {
  0: "Mer d'huile, pas de vent",
  1: 'Rides légères sur l\'eau',
  2: 'Quelques vaguelettes',
  3: 'Quelques moutons, navigation idéale',
  4: 'Vagues courtes, mer agitée',
  5: 'Vagues modérées, embruns',
  6: 'Lames déferlantes, embruns fréquents',
  7: 'Mer forte, navigation difficile',
  8: 'Très forte mer, dangereux',
  9: 'Haute mer, gros coup de vent',
  10: 'Très haute mer, tempête',
  11: 'Mer énorme, violente tempête',
  12: 'Mer exceptionnelle, ouragan',
};

function dirArrow(deg: number): string {
  const n = ((deg % 360) + 360) % 360;
  if (n < 22.5 || n >= 337.5) return '↓';
  if (n < 67.5) return '↙';
  if (n < 112.5) return '←';
  if (n < 157.5) return '↖';
  if (n < 202.5) return '↑';
  if (n < 247.5) return '↗';
  if (n < 292.5) return '→';
  return '↘';
}

function exceededRange(hours: HourlyWeather[]): string {
  if (!hours.length) return '';
  const first = new Date(hours[0].time).getHours();
  const last = new Date(hours[hours.length - 1].time).getHours();
  return first === last ? `${first}h` : `${first}h–${last + 1}h`;
}

// Chart constants
const BAR_W = 10;
const BAR_GAP = 3;
const PAD_L = 14;
const CHART_H = 70; // bottom y = 0 kn
const CHART_TOP = 10; // top y = max display kn
const DIR_Y = 90;
const HOUR_Y = 103;
const SVG_H = 110;

export default function WindScreen({ weatherData, selectedDate, maxDate, dayVerdicts, onSelectDate, port, boat, onNav }: Props) {
  const warnWind = boat.warnWind ?? 15;
  const maxWind = boat.maxWind ?? 25;

  const dateLabel = useMemo(() => {
    const d = selectedDate;
    return `${DAY_ABBR[d.getDay()]}. ${d.getDate()}`;
  }, [selectedDate]);

  const todayStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  const todayHourly = useMemo(() => {
    if (!weatherData) return [];
    return weatherData.hourly.filter(h => h.time.slice(0, 10) === todayStr);
  }, [weatherData, todayStr]);

  const weekSummary = useMemo(() => {
    if (!weatherData) return [];
    const byDay: Record<string, { speeds: number[]; gusts: number[] }> = {};
    for (const h of weatherData.hourly) {
      const day = h.time.slice(0, 10);
      if (!byDay[day]) byDay[day] = { speeds: [], gusts: [] };
      byDay[day].speeds.push(h.windSpeed);
      byDay[day].gusts.push(h.windGust);
    }
    return Object.entries(byDay).slice(0, 7).map(([dateStr, d]) => {
      const date = new Date(dateStr + 'T12:00:00');
      return {
        dateStr,
        date,
        minSpeed: Math.round(Math.min(...d.speeds)),
        maxSpeed: Math.round(Math.max(...d.speeds)),
        maxGust: Math.round(Math.max(...d.gusts)),
      };
    });
  }, [weatherData]);

  const currentSpeed = weatherData ? Math.round(weatherData.windSpeed) : 0;
  const currentGust = weatherData ? Math.round(weatherData.windGust) : 0;
  const currentDir = weatherData ? weatherData.windDirection : 0;
  const compass = degreesToCompass(currentDir);
  const beaufort = beaufortScale(currentSpeed);

  const todaySpeeds = todayHourly.map(h => h.windSpeed);
  const todayGusts = todayHourly.map(h => h.windGust);
  const todayMin = todaySpeeds.length ? Math.round(Math.min(...todaySpeeds)) : 0;
  const todayGustMax = todayGusts.length ? Math.round(Math.max(...todayGusts)) : currentGust;

  const heroLvl = windLevel(currentSpeed, warnWind, maxWind);
  const heroInk = heroLvl === 'red' ? COLORS.stopDeep : heroLvl === 'orange' ? COLORS.warnDeep : COLORS.goInk;
  const heroBg = heroLvl === 'red' ? '#f5bab5' : heroLvl === 'orange' ? '#fad9a0' : '#c5e8d0';
  const heroBadgeBg = heroLvl === 'red' ? COLORS.stop : heroLvl === 'orange' ? COLORS.warn : COLORS.go;
  const beaufortBg = heroLvl === 'red' ? '#f5bab5' : heroLvl === 'orange' ? '#f3c474' : '#c5e8d0';

  const exceededHours = todayHourly.filter(h => h.windSpeed >= maxWind);

  // Chart y scale: CHART_H = 0 kn, CHART_TOP = displayMax kn
  const displayMax = Math.max(30, maxWind + 8, todayGustMax + 4);
  const yScale = (CHART_H - CHART_TOP) / displayMax;
  const yFor = (kn: number) => CHART_H - kn * yScale;

  const currentHour = new Date().getHours();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = todayStr === nowStr;

  const chartWidth = PAD_L + todayHourly.length * (BAR_W + BAR_GAP) + 20;

  return (
    <View style={styles.root}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNav('home')} activeOpacity={0.7}>
          <Icon name="chevronLeft" size={20} stroke={COLORS.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.titleMain}>Vent</Text>
          <Text style={styles.titleSub}>{port.name} · {dateLabel}</Text>
        </View>
        <AppLogo height={28} />
      </View>

      <DateStrip selectedDate={selectedDate} maxDate={maxDate} verdicts={dayVerdicts} onSelect={onSelectDate} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={[styles.hero, { backgroundColor: heroBg }]}>
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
            <View style={[styles.badgeDot, { backgroundColor: heroInk }]} />
            <Text style={[styles.badgeText, { color: heroInk }]}>EN COURS</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <View style={styles.heroSpeedRow}>
                <Text style={[styles.heroSpeed, { color: heroInk }]}>{currentSpeed}</Text>
                <Text style={[styles.heroUnit, { color: heroInk }]}>kn</Text>
              </View>
              <Text style={[styles.heroLabel, { color: heroInk, opacity: 0.75 }]}>Vent moyen</Text>
              <View style={[styles.gustRow, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
                <Icon name="wind" size={13} stroke={heroInk} strokeWidth={2.5} />
                <Text style={[styles.gustText, { color: heroInk }]}>
                  Rafales : <Text style={styles.gustBold}>{currentGust} kn</Text>
                </Text>
              </View>
            </View>
            <View style={styles.compassBlock}>
              <Compass
                deg={currentDir}
                size={80}
                color={heroInk}
                bg="rgba(255,255,255,0.35)"
              />
              <Text style={[styles.compassLabel, { color: heroInk }]}>{compass}</Text>
            </View>
          </View>
        </View>

        {/* BEAUFORT */}
        <View style={styles.beaufortCard}>
          <View style={[styles.beaufortBadge, { backgroundColor: beaufortBg }]}>
            <Text style={[styles.beaufortNum, { color: heroInk }]}>{beaufort.force}</Text>
          </View>
          <View style={styles.beaufortInfo}>
            <Text style={styles.beaufortTitle}>Beaufort {beaufort.force} — {beaufort.description}</Text>
            <Text style={styles.beaufortDesc}>{BEAUFORT_DESC[beaufort.force] ?? ''}</Text>
          </View>
          <View style={styles.bftScale}>
            {Array.from({ length: 12 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.bftSeg,
                  i < beaufort.force && {
                    backgroundColor: beaufort.force >= 8 ? COLORS.stop
                      : beaufort.force >= 5 ? COLORS.warn
                      : COLORS.go,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* TODAY CHART */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <Text style={styles.sectionSub}>seuil {maxWind} kn</Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartStats}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{todayMin} kn</Text>
              <Text style={styles.statLbl}>MIN</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={[styles.statVal, { color: windColor(currentSpeed, warnWind, maxWind) }]}>
                {currentSpeed} kn
              </Text>
              <Text style={styles.statLbl}>MAINTENANT</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
              <Text style={styles.statVal}>{todayGustMax} kn</Text>
              <Text style={styles.statLbl}>RAFALE MAX</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollArea}>
            <Svg width={Math.max(chartWidth, 343)} height={SVG_H}>
              {/* Grid */}
              <Line x1={0} y1={yFor(0)} x2={chartWidth} y2={yFor(0)} stroke={COLORS.hairline} strokeWidth={1} />
              <Line x1={0} y1={yFor(15)} x2={chartWidth} y2={yFor(15)} stroke={COLORS.hairline} strokeWidth={1} />
              <Line x1={0} y1={yFor(30)} x2={chartWidth} y2={yFor(30)} stroke={COLORS.hairline} strokeWidth={1} />

              {/* Threshold line */}
              <Line
                x1={0} y1={yFor(maxWind)} x2={chartWidth} y2={yFor(maxWind)}
                stroke={COLORS.warnDeep} strokeWidth={1} strokeDasharray="4,3" opacity={0.6}
              />
              <SvgText x={3} y={yFor(maxWind) - 3} fontSize={8} fill={COLORS.warnDeep} opacity={0.8}>
                {maxWind}
              </SvgText>

              {/* Y labels */}
              <SvgText x={0} y={yFor(0) + 4} fontSize={8} fill={COLORS.ink4}>0</SvgText>
              <SvgText x={0} y={yFor(15) + 4} fontSize={8} fill={COLORS.ink4}>15</SvgText>
              <SvgText x={0} y={yFor(30) + 4} fontSize={8} fill={COLORS.ink4}>30</SvgText>

              <G x={PAD_L}>
                {todayHourly.map((h, i) => {
                  const x = i * (BAR_W + BAR_GAP);
                  const hour = new Date(h.time).getHours();
                  const barH = Math.max(2, h.windSpeed * yScale);
                  const barY = yFor(h.windSpeed);
                  const gustH = Math.max(0, (h.windGust - h.windSpeed) * yScale);
                  const gustY = barY - gustH;
                  const color = windColor(h.windSpeed, warnWind, maxWind);
                  const isCurrentHour = isToday && hour === currentHour;

                  return (
                    <G key={i}>
                      <Rect
                        x={x} y={barY} width={BAR_W} height={barH}
                        rx={3} fill={color} opacity={isCurrentHour ? 1 : 0.8}
                      />
                      {gustH > 2 && (
                        <Rect
                          x={x} y={gustY} width={BAR_W} height={Math.min(gustH, 4)}
                          rx={2} fill={COLORS.ink} opacity={0.15}
                        />
                      )}
                      <SvgText
                        x={x + BAR_W / 2} y={DIR_Y}
                        fontSize={7} fill={COLORS.ink3} opacity={0.5} textAnchor="middle"
                      >
                        {dirArrow(h.windDirection)}
                      </SvgText>
                      {hour % 6 === 0 && (
                        <SvgText
                          x={x + BAR_W / 2} y={HOUR_Y}
                          fontSize={8} fill={isCurrentHour ? COLORS.warnDeep : COLORS.ink4}
                          textAnchor="middle"
                        >
                          {hour}h
                        </SvgText>
                      )}
                    </G>
                  );
                })}
              </G>
            </Svg>
          </ScrollView>

          {exceededHours.length > 0 && (
            <View style={styles.thresholdPill}>
              <Text style={styles.thresholdText}>
                Votre max : <Text style={styles.thresholdBold}>{maxWind} kn</Text>
                {' '}— dépassé {exceededRange(exceededHours)}
              </Text>
            </View>
          )}
          <View style={{ height: 8 }} />
        </View>

        {/* 7-DAY LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7 prochains jours</Text>
        </View>

        <View style={styles.weekCard}>
          {weekSummary.map((day, i) => {
            const isCurrentDay = day.dateStr === todayStr;
            const lvl = windLevel(day.maxSpeed, warnWind, maxWind);
            const chipBg = lvl === 'red' ? COLORS.stop : lvl === 'orange' ? COLORS.warn : COLORS.go;
            const chipColor = lvl === 'red' ? COLORS.stopDeep : lvl === 'orange' ? COLORS.warnDeep : COLORS.goDeep;
            const chipLabel = lvl === 'red' ? '✕' : lvl === 'orange' ? '≈' : '✓';
            const barPct = Math.min(1, day.maxSpeed / Math.max(maxWind * 1.5, 30));
            const barColor = windColor(day.maxSpeed, warnWind, maxWind);

            return (
              <View
                key={day.dateStr}
                style={[styles.dayRow, isCurrentDay && styles.dayRowToday, i > 0 && styles.dayRowBorder]}
              >
                <View style={styles.dayName}>
                  <Text style={styles.dayAbbr}>{DAY_ABBR[day.date.getDay()]}</Text>
                  <Text style={styles.dayNum}>{day.date.getDate()}</Text>
                </View>
                <View style={styles.dayBarWrap}>
                  <View style={[styles.dayBar, { width: `${barPct * 100}%` as any, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.dayRange}>{day.minSpeed}–{day.maxSpeed} kn</Text>
                <View style={[styles.dayChip, { backgroundColor: chipBg }]}>
                  <Text style={[styles.dayChipText, { color: chipColor }]}>{chipLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  titleMain: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  titleSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.ink3,
    marginTop: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Hero
  hero: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.5,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { flex: 1 },
  heroSpeedRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  heroSpeed: {
    fontSize: 54,
    fontFamily: FONTS.bold,
    lineHeight: 56,
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    marginBottom: 6,
    opacity: 0.7,
  },
  heroLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    marginTop: 3,
  },
  gustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  gustText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  gustBold: {
    fontFamily: FONTS.bold,
  },
  compassBlock: {
    alignItems: 'center',
    gap: 6,
  },
  compassLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    opacity: 0.8,
  },

  // Beaufort
  beaufortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  beaufortBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  beaufortNum: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  beaufortInfo: { flex: 1 },
  beaufortTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.ink,
  },
  beaufortDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.ink3,
    marginTop: 2,
  },
  bftScale: {
    flexDirection: 'column',
    gap: 2,
  },
  bftSeg: {
    width: 7,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.hairline,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
    letterSpacing: -0.1,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.ink4,
  },

  // Chart
  chartCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: 'hidden',
    marginBottom: 8,
  },
  chartStats: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.hairline,
  },
  statVal: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  statLbl: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.ink4,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  chartScrollArea: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  thresholdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: '#fff8ee',
    borderWidth: 1,
    borderColor: COLORS.warn,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  thresholdText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.warnDeep,
  },
  thresholdBold: {
    fontFamily: FONTS.bold,
  },

  // 7-day
  weekCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  dayRowToday: { backgroundColor: COLORS.paperSoft },
  dayRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f3f7',
  },
  dayName: { width: 38 },
  dayAbbr: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.ink,
  },
  dayNum: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.ink4,
  },
  dayBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  dayRange: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.ink2,
    width: 60,
    textAlign: 'right',
  },
  dayChip: {
    width: 28,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
});
