import { Port, TideData, TidePoint } from '../types';
import { findTidePeaks, calculateCoefficient, getCurrentHeight } from '../utils/tideCalculator';
import { getPointsForDate } from './remoteTideService';

const BASE_URL = 'https://api-maree.fr';
const API_KEY = '84efb238e4a77a6e1ea52e82c537c1a3';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDateRange(date: Date): { from: string; to: string } {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00`;
  };
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return { from: fmt(date), to: fmt(next) };
}

function buildTideData(port: Port, points: TidePoint[], isToday: boolean): TideData {
  const peaks = findTidePeaks(points);
  const coefficient = calculateCoefficient(peaks, port.refMarnage);
  const { height: currentHeight, isRising } = isToday
    ? getCurrentHeight(points)
    : { height: 0, isRising: true };
  return { port: port.id, points, peaks, coefficient, currentHeight, isRising };
}

export async function fetchTideData(
  port: Port,
  apiKey: string,
  selectedDate: Date = new Date(),
  extraDays: number = 0
): Promise<TideData> {
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  // Points du jour principal (pour peaks / coefficient / currentHeight)
  let basePoints = await getPointsForDate(port.id, selectedDate);

  if (!basePoints) {
    // Fallback API uniquement pour aujourd'hui
    if (!isToday) throw new Error('Données non disponibles pour cette date');

    const key = apiKey || API_KEY;
    const { from, to } = buildDateRange(today);

    const url =
      `${BASE_URL}/water-levels` +
      `?site=${port.id}` +
      `&from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}` +
      `&step=10` +
      `&tz=Europe%2FParis` +
      `&key=${key}`;

    const response = await fetch(url);

    if (response.status === 401 || response.status === 403) throw new Error('CLÉ_API_INVALIDE');
    if (!response.ok) throw new Error(`Erreur API marée : ${response.status}`);

    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) throw new Error('Format de réponse invalide');

    basePoints = json.data.map((item: { time: string; height: number }) => ({
      time: item.time,
      height: Number(item.height),
    }));
  }

  const safeBase = basePoints ?? [];

  // Calcul des métadonnées sur le jour principal uniquement
  const peaks = findTidePeaks(safeBase);
  const coefficient = calculateCoefficient(peaks, port.refMarnage);
  const { height: currentHeight, isRising } = isToday
    ? getCurrentHeight(safeBase)
    : { height: 0, isRising: true };

  // Merge des jours supplémentaires pour la timeline étendue
  const allPoints: TidePoint[] = [...safeBase];
  for (let i = 1; i <= extraDays; i++) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + i);
    const extra = await getPointsForDate(port.id, d);
    if (extra) allPoints.push(...extra);
  }

  return { port: port.id, points: allPoints, peaks, coefficient, currentHeight, isRising };
}
