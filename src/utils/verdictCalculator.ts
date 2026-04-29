import { WeatherData, HourlyWeather, VerdictLevel, VerdictResult, BoatSettings, BOAT_DEFAULT, TideData, TidePoint } from '../types';

// Niveau météo uniquement (vent + vagues)
export function assessWeatherLevel(
  windSpeed: number,
  windGust: number,
  waveHeight: number,
  boat: BoatSettings = BOAT_DEFAULT
): VerdictLevel {
  if (windSpeed >= boat.maxWind || windGust >= boat.maxWind * 1.3 || waveHeight >= boat.maxWaves) return 'red';
  if (windSpeed >= boat.maxWind * 0.8 || windGust >= boat.maxWind || waveHeight >= boat.maxWaves * 0.8) return 'orange';
  return 'green';
}

// Niveau hauteur d'eau uniquement
export function assessTideLevel(tideHeight: number, draft: number): VerdictLevel {
  if (tideHeight <= draft) return 'red';
  if (tideHeight < draft * 1.5) return 'orange';
  return 'green';
}

// Pire des deux niveaux
export function worstLevel(a: VerdictLevel, b: VerdictLevel): VerdictLevel {
  if (a === 'red' || b === 'red') return 'red';
  if (a === 'orange' || b === 'orange') return 'orange';
  return 'green';
}

// Niveau global (pour affichage ponctuel : carte / conditionBar)
export function assessLevel(
  windSpeed: number,
  windGust: number,
  waveHeight: number,
  boat: BoatSettings = BOAT_DEFAULT,
  tideHeight?: number
): VerdictLevel {
  const weather = assessWeatherLevel(windSpeed, windGust, waveHeight, boat);
  if (tideHeight === undefined || tideHeight <= 0) return weather;
  return worstLevel(weather, assessTideLevel(tideHeight, boat.draft));
}

// Lisse les niveaux de marée : jamais de transition directe vert↔rouge
export function smoothTideLevels(levels: VerdictLevel[]): VerdictLevel[] {
  const s = [...levels];
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === 'green' && s[i + 1] === 'red')  s[i] = 'orange';
    if (s[i] === 'red'   && s[i + 1] === 'green') s[i + 1] = 'orange';
  }
  return s;
}

function levelToScore(level: VerdictLevel): number {
  if (level === 'green') return 90;
  if (level === 'orange') return 50;
  return 10;
}

function buildTideByHour(points: TidePoint[], dayPrefix: string): Record<number, number> {
  const map: Record<number, number> = {};
  for (const p of points) {
    if (!p.time.startsWith(dayPrefix)) continue;
    const hour = parseInt(p.time.split('T')[1]?.slice(0, 2) ?? '0', 10);
    if (!isNaN(hour)) {
      // Minimum de l'heure (pire cas sur les 10 min)
      map[hour] = map[hour] !== undefined ? Math.min(map[hour], p.height) : p.height;
    }
  }
  return map;
}

function buildHourlyScores(
  hourly: HourlyWeather[],
  dayPrefix: string,
  boat: BoatSettings,
  tidePoints?: TidePoint[]
): number[] {
  const dayData = hourly.filter(h => h.time.startsWith(dayPrefix));
  const tideByHour = tidePoints ? buildTideByHour(tidePoints, dayPrefix) : {};

  // Niveaux marée bruts puis lissés (uniquement pour la marée)
  const rawTide: VerdictLevel[] = Array.from({ length: 24 }, (_, i) => {
    const h = tideByHour[i];
    return h !== undefined ? assessTideLevel(h, boat.draft) : 'green';
  });
  const smoothedTide = smoothTideLevels(rawTide);

  const byHour: Record<number, number> = {};
  for (const h of dayData) {
    const hour = parseInt(h.time.split('T')[1]?.slice(0, 2) ?? '0', 10);
    const level = worstLevel(assessWeatherLevel(h.windSpeed, h.windGust, h.waveHeight, boat), smoothedTide[hour]);
    byHour[hour] = levelToScore(level);
  }
  return Array.from({ length: 24 }, (_, i) => byHour[i] ?? 50);
}

function findAllWindows(scores: number[]): { start: number; end: number }[] {
  const threshold = scores.some(s => s >= 80) ? 80 : 30;
  const windows: { start: number; end: number }[] = [];
  let i = 0;
  while (i < 24) {
    if (scores[i] >= threshold) {
      let j = i;
      while (j < 24 && scores[j] >= threshold) j++;
      windows.push({ start: i, end: j - 1 });
      i = j;
    } else {
      i++;
    }
  }
  return windows;
}

export function calculateVerdict(
  weather: WeatherData,
  boat: BoatSettings = BOAT_DEFAULT,
  selectedDate: Date = new Date(),
  tideData?: TideData | null
): VerdictResult {
  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const d = String(selectedDate.getDate()).padStart(2, '0');
  const dayPrefix = `${y}-${m}-${d}`;
  const hourlyScores = buildHourlyScores(weather.hourly, dayPrefix, boat, tideData?.points);

  const currentTideHeight = tideData?.currentHeight;
  const level = assessLevel(weather.windSpeed, weather.windGust, weather.waveHeight, boat, currentTideHeight);

  const reasons: string[] = [];
  if (currentTideHeight !== undefined && currentTideHeight > 0) {
    if (currentTideHeight <= boat.draft)
      reasons.push(`Eau insuffisante : ${currentTideHeight.toFixed(1)} m (TE ${boat.draft} m)`);
    else if (currentTideHeight < boat.draft * 1.5)
      reasons.push(`Faible hauteur d'eau : ${currentTideHeight.toFixed(1)} m (TE ${boat.draft} m)`);
  }
  if (weather.windSpeed >= boat.maxWind * 0.8)
    reasons.push(`Vent ${Math.round(weather.windSpeed)} nœuds (seuil ${boat.maxWind} kn)`);
  if (weather.windGust >= boat.maxWind)
    reasons.push(`Rafales ${Math.round(weather.windGust)} nœuds`);
  if (weather.waveHeight >= boat.maxWaves * 0.8)
    reasons.push(`Vagues ${weather.waveHeight.toFixed(1)} m (seuil ${boat.maxWaves} m)`);
  if (level === 'green' && reasons.length === 0)
    reasons.push(`Vent ${Math.round(weather.windSpeed)} kn · Vagues ${weather.waveHeight.toFixed(1)} m`);

  const recommendedWindows = findAllWindows(hourlyScores);

  const titles: Record<VerdictLevel, string> = {
    green:  'Conditions favorables',
    orange: 'Sortie possible',
    red:    'Sortie déconseillée',
  };

  return { level, hourlyScores, title: titles[level], reasons, recommendedWindows };
}
