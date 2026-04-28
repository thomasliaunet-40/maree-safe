import { WeatherData, HourlyWeather, VerdictLevel, VerdictResult, BoatSettings, BOAT_DEFAULT, TideData, TidePoint } from '../types';

// Score 0–100 basé sur les seuils du voilier (+ hauteur d'eau optionnelle)
export function computeScore(
  windSpeed: number,
  windGust: number,
  waveHeight: number,
  boat: BoatSettings = BOAT_DEFAULT,
  tideHeight?: number
): number {
  const windR = windSpeed / boat.maxWind;
  const gustR = windGust / (boat.maxWind * 1.3);
  const waveR = waveHeight / boat.maxWaves;

  if (tideHeight !== undefined && tideHeight > 0) {
    const draftR = boat.draft / tideHeight;
    // Bateau échoué ou eau insuffisante → impossible
    if (draftR >= 1.0) return 0;
    // Normalise : marge de 15% = "à la limite" (équivalent windR=1.0)
    const tideR = draftR / 0.85;
    const worst = Math.max(windR, gustR, waveR, tideR);
    return Math.round(Math.max(0, Math.min(100, 100 - 55 * Math.pow(worst, 1.5))));
  }

  const worst = Math.max(windR, gustR, waveR);
  return Math.round(Math.max(0, Math.min(100, 100 - 55 * Math.pow(worst, 1.5))));
}

export function levelFromScore(score: number): VerdictLevel {
  if (score >= 65) return 'green';
  if (score >= 35) return 'orange';
  return 'red';
}

// Rétrocompat — utilisé dans TideChartVertical
export function assessConditions(
  windSpeed: number,
  windGust: number,
  waveHeight: number
): { wind: VerdictLevel; gust: VerdictLevel; wave: VerdictLevel; overall: VerdictLevel } {
  const score = computeScore(windSpeed, windGust, waveHeight);
  const overall = levelFromScore(score);
  const wind: VerdictLevel  = windSpeed > 25 ? 'red' : windSpeed > 15 ? 'orange' : 'green';
  const gust: VerdictLevel  = windGust  > 32 ? 'red' : windGust  > 22 ? 'orange' : 'green';
  const wave: VerdictLevel  = waveHeight > 2.5 ? 'red' : waveHeight > 1.5 ? 'orange' : 'green';
  return { wind, gust, wave, overall };
}

// Construit une map heure → hauteur d'eau à partir des points de marée
function buildTideByHour(points: TidePoint[], dayPrefix: string): Record<number, number> {
  const map: Record<number, number> = {};
  for (const p of points) {
    if (!p.time.startsWith(dayPrefix)) continue;
    const timePart = p.time.split('T')[1] ?? '';
    const hour = parseInt(timePart.slice(0, 2), 10);
    if (!isNaN(hour)) map[hour] = p.height;
  }
  return map;
}

// Calcule les 24 scores horaires (un par heure 0h–23h)
function buildHourlyScores(
  hourly: HourlyWeather[],
  dayPrefix: string,
  boat: BoatSettings,
  tidePoints?: TidePoint[]
): number[] {
  const dayData = hourly.filter(h => h.time.startsWith(dayPrefix));
  const tideByHour = tidePoints ? buildTideByHour(tidePoints, dayPrefix) : {};
  const byHour: Record<number, number> = {};
  for (const h of dayData) {
    const timePart = h.time.split('T')[1] ?? '';
    const hour = parseInt(timePart.slice(0, 2), 10);
    const tideHeight = tideByHour[hour];
    byHour[hour] = computeScore(h.windSpeed, h.windGust, h.waveHeight, boat, tideHeight);
  }
  return Array.from({ length: 24 }, (_, i) => byHour[i] ?? 50);
}

function findBestWindow(scores: number[]): { start: number; end: number } | null {
  let best: { start: number; end: number; len: number } | null = null;
  let i = 0;
  while (i < 24) {
    if (scores[i] >= 65) {
      let j = i;
      while (j < 24 && scores[j] >= 65) j++;
      const len = j - i;
      if (!best || len > best.len) best = { start: i, end: j - 1, len };
      i = j;
    } else {
      i++;
    }
  }
  // Fallback: meilleure plage orange
  if (!best) {
    let i2 = 0;
    while (i2 < 24) {
      if (scores[i2] >= 35) {
        let j = i2;
        while (j < 24 && scores[j] >= 35) j++;
        const len = j - i2;
        if (!best || len > (best as any).len) best = { start: i2, end: j - 1, len };
        i2 = j;
      } else {
        i2++;
      }
    }
  }
  if (!best || best.len < 1) return null;
  return { start: best.start, end: best.end };
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

  const currentHour = new Date().getHours();
  const currentTideHeight = tideData?.currentHeight;
  const score = hourlyScores[currentHour]
    ?? computeScore(weather.windSpeed, weather.windGust, weather.waveHeight, boat, currentTideHeight);
  const level = levelFromScore(score);

  const reasons: string[] = [];
  if (currentTideHeight !== undefined && currentTideHeight > 0) {
    const draftR = boat.draft / currentTideHeight;
    if (draftR >= 1.0)
      reasons.push(`Eau insuffisante : ${currentTideHeight.toFixed(1)} m (TE ${boat.draft} m)`);
    else if (draftR >= 0.85)
      reasons.push(`Faible hauteur d'eau : ${currentTideHeight.toFixed(1)} m (TE ${boat.draft} m)`);
  }
  if (weather.windSpeed > boat.maxWind * 0.8)
    reasons.push(`Vent ${Math.round(weather.windSpeed)} nœuds (seuil ${boat.maxWind} kn)`);
  if (weather.windGust > boat.maxWind * 1.1)
    reasons.push(`Rafales ${Math.round(weather.windGust)} nœuds`);
  if (weather.waveHeight > boat.maxWaves * 0.8)
    reasons.push(`Vagues ${weather.waveHeight.toFixed(1)} m (seuil ${boat.maxWaves} m)`);
  if (level === 'green' && reasons.length === 0)
    reasons.push(`Vent ${Math.round(weather.windSpeed)} kn · Vagues ${weather.waveHeight.toFixed(1)} m`);

  const recommendedWindow = findBestWindow(hourlyScores);

  const titles: Record<VerdictLevel, string> = {
    green:  'Conditions favorables',
    orange: 'Sortie possible',
    red:    'Sortie déconseillée',
  };
  const subtitles: Record<VerdictLevel, string> = {
    green:  'Vous pouvez sortir en toute sécurité.',
    orange: 'Conditions correctes, restez vigilant.',
    red:    'Attendez une meilleure fenêtre.',
  };

  return { level, score, hourlyScores, title: titles[level], subtitle: subtitles[level], reasons, recommendedWindow };
}
