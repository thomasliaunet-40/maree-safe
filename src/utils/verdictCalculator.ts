import { WeatherData, HourlyWeather, VerdictLevel, VerdictResult, BoatSettings, BOAT_DEFAULT, TideData, TidePoint } from '../types';

// Règle simple : vert / orange / rouge selon les seuils du bateau
export function assessLevel(
  windSpeed: number,
  windGust: number,
  waveHeight: number,
  boat: BoatSettings = BOAT_DEFAULT,
  tideHeight?: number
): VerdictLevel {
  // Rouge : au moins une limite dépassée
  if (windSpeed >= boat.maxWind) return 'red';
  if (windGust >= boat.maxWind * 1.3) return 'red';
  if (waveHeight >= boat.maxWaves) return 'red';
  if (tideHeight !== undefined && tideHeight > 0 && tideHeight < boat.draft) return 'red';

  // Orange : proche d'une limite (>= 80%)
  if (windSpeed >= boat.maxWind * 0.8) return 'orange';
  if (windGust >= boat.maxWind) return 'orange';
  if (waveHeight >= boat.maxWaves * 0.8) return 'orange';
  if (tideHeight !== undefined && tideHeight > 0 && tideHeight < boat.draft * 1.25) return 'orange';

  return 'green';
}

// Valeur interne pour la timeline (barres visuelles uniquement, jamais affiché)
function levelToScore(level: VerdictLevel): number {
  if (level === 'green') return 90;
  if (level === 'orange') return 50;
  return 10;
}

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
    byHour[hour] = levelToScore(assessLevel(h.windSpeed, h.windGust, h.waveHeight, boat, tideByHour[hour]));
  }
  return Array.from({ length: 24 }, (_, i) => byHour[i] ?? 50);
}

function findAllWindows(scores: number[]): { start: number; end: number }[] {
  // Cherche les fenêtres vertes (90) puis orange+vert (>= 30)
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

  const currentHour = new Date().getHours();
  const currentTideHeight = tideData?.currentHeight;
  const level = assessLevel(weather.windSpeed, weather.windGust, weather.waveHeight, boat, currentTideHeight);

  const reasons: string[] = [];
  if (currentTideHeight !== undefined && currentTideHeight > 0) {
    if (currentTideHeight < boat.draft)
      reasons.push(`Eau insuffisante : ${currentTideHeight.toFixed(1)} m (TE ${boat.draft} m)`);
    else if (currentTideHeight < boat.draft * 1.25)
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
