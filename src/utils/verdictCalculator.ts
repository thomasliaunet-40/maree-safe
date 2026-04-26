import { TideData, WeatherData, HourlyWeather, VerdictLevel, VerdictResult } from '../types';
import { formatTime } from './tideCalculator';

interface ConditionLevel {
  wind: VerdictLevel;
  gust: VerdictLevel;
  wave: VerdictLevel;
  overall: VerdictLevel;
}

export function assessConditions(windSpeed: number, windGust: number, waveHeight: number): ConditionLevel {
  const wind: VerdictLevel = windSpeed > 25 ? 'red' : windSpeed > 15 ? 'orange' : 'green';
  const gust: VerdictLevel = windGust > 32 ? 'red' : windGust > 22 ? 'orange' : 'green';
  const wave: VerdictLevel = waveHeight > 2.5 ? 'red' : waveHeight > 1.5 ? 'orange' : 'green';

  const levels: VerdictLevel[] = [wind, gust, wave];
  const overall: VerdictLevel = levels.includes('red') ? 'red' : levels.includes('orange') ? 'orange' : 'green';

  return { wind, gust, wave, overall };
}

function worstLevel(a: VerdictLevel, b: VerdictLevel): VerdictLevel {
  if (a === 'red' || b === 'red') return 'red';
  if (a === 'orange' || b === 'orange') return 'orange';
  return 'green';
}

function findBestWindow(hourly: HourlyWeather[]): { start: string; end: string; level: VerdictLevel } | null {
  if (hourly.length === 0) return null;

  const verdicts = hourly.map(h => assessConditions(h.windSpeed, h.windGust, h.waveHeight).overall);

  // Chercher la plus longue plage verte
  let best: { start: number; end: number; level: VerdictLevel } | null = null;

  for (let targetLevel of ['green', 'orange'] as VerdictLevel[]) {
    for (let i = 0; i < verdicts.length; i++) {
      if (verdicts[i] === targetLevel || (targetLevel === 'orange' && verdicts[i] === 'green')) {
        let j = i;
        while (j < verdicts.length && (verdicts[j] === 'green' || (targetLevel === 'orange' && verdicts[j] === 'orange'))) {
          j++;
        }
        const length = j - i;
        if (!best || length > best.end - best.start) {
          best = { start: i, end: j - 1, level: targetLevel };
        }
        i = j - 1;
      }
    }
    if (best && best.end - best.start >= 2) break; // Au moins 2h de fenêtre
  }

  if (!best) return null;

  return {
    start: formatTime(hourly[best.start].time),
    end: formatTime(hourly[Math.min(best.end, hourly.length - 1)].time),
    level: best.level,
  };
}

export function calculateVerdict(
  weather: WeatherData,
  _tide: TideData | null
): VerdictResult {
  const current = assessConditions(weather.windSpeed, weather.windGust, weather.waveHeight);
  const reasons: string[] = [];

  if (current.wind === 'red') reasons.push(`Vent trop fort : ${Math.round(weather.windSpeed)} nœuds`);
  else if (current.wind === 'orange') reasons.push(`Vent soutenu : ${Math.round(weather.windSpeed)} nœuds`);

  if (current.gust === 'red') reasons.push(`Rafales dangereuses : ${Math.round(weather.windGust)} nœuds`);
  else if (current.gust === 'orange') reasons.push(`Rafales fortes : ${Math.round(weather.windGust)} nœuds`);

  if (current.wave === 'red') reasons.push(`Mer très agitée : ${weather.waveHeight.toFixed(1)} m`);
  else if (current.wave === 'orange') reasons.push(`Mer formée : ${weather.waveHeight.toFixed(1)} m`);

  if (current.overall === 'green' && reasons.length === 0) {
    reasons.push(`Vent ${Math.round(weather.windSpeed)} nœuds, vagues ${weather.waveHeight.toFixed(1)} m`);
  }

  const recommendedWindow = findBestWindow(weather.hourly);

  const titles: Record<VerdictLevel, string> = {
    green: 'Conditions favorables',
    orange: 'Navigation possible avec prudence',
    red: 'Navigation déconseillée',
  };

  const subtitles: Record<VerdictLevel, string> = {
    green: 'Belle journée de navigation',
    orange: 'Voiliers expérimentés uniquement',
    red: 'Restez au port',
  };

  return {
    level: current.overall,
    title: titles[current.overall],
    subtitle: subtitles[current.overall],
    reasons,
    recommendedWindow,
  };
}
