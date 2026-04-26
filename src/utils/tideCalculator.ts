import { TidePoint, TidePeak } from '../types';

export function findTidePeaks(points: TidePoint[]): TidePeak[] {
  if (points.length < 10) return [];

  const WINDOW = 4; // points de chaque côté (~40min à step=10min)
  const candidates: TidePeak[] = [];

  for (let i = WINDOW; i < points.length - WINDOW; i++) {
    const h = points[i].height;
    const surrounding = [
      ...points.slice(i - WINDOW, i),
      ...points.slice(i + 1, i + WINDOW + 1),
    ].map(p => p.height);

    const isHigh = surrounding.every(s => h >= s);
    const isLow = surrounding.every(s => h <= s);

    if (isHigh) {
      candidates.push({ type: 'high', time: points[i].time, height: h, label: 'PM' });
    } else if (isLow) {
      candidates.push({ type: 'low', time: points[i].time, height: h, label: 'BM' });
    }
  }

  // Dédoublonnage : garder le plus extrême dans une fenêtre de 2h
  return deduplicatePeaks(candidates);
}

function deduplicatePeaks(peaks: TidePeak[]): TidePeak[] {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const result: TidePeak[] = [];

  for (const peak of peaks) {
    const t = new Date(peak.time).getTime();
    const existing = result.find(
      p =>
        p.type === peak.type &&
        Math.abs(new Date(p.time).getTime() - t) < TWO_HOURS_MS
    );

    if (!existing) {
      result.push(peak);
    } else {
      const isMoreExtreme =
        peak.type === 'high'
          ? peak.height > existing.height
          : peak.height < existing.height;
      if (isMoreExtreme) {
        const idx = result.indexOf(existing);
        result[idx] = peak;
      }
    }
  }

  return result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function calculateCoefficient(peaks: TidePeak[], refMarnage: number): number {
  const highTides = peaks.filter(p => p.type === 'high');
  const lowTides = peaks.filter(p => p.type === 'low');

  if (highTides.length === 0 || lowTides.length === 0) return 70;

  const maxHigh = Math.max(...highTides.map(p => p.height));
  const minLow = Math.min(...lowTides.map(p => p.height));
  const marnage = maxHigh - minLow;

  return Math.round(Math.min(120, Math.max(20, (marnage / refMarnage) * 70)));
}

export function getCurrentHeight(points: TidePoint[]): { height: number; isRising: boolean } {
  if (points.length === 0) return { height: 0, isRising: true };

  const now = Date.now();
  let closest = points[0];
  let minDiff = Infinity;

  for (const p of points) {
    const diff = Math.abs(new Date(p.time).getTime() - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }

  const idx = points.indexOf(closest);
  const prev = points[Math.max(0, idx - 3)];
  const isRising = closest.height >= prev.height;

  return { height: closest.height, isRising };
}

export function formatTime(isoTime: string): string {
  const d = new Date(isoTime);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function coefficientLabel(coeff: number): string {
  if (coeff >= 95) return 'Grande vive-eau';
  if (coeff >= 80) return 'Vive-eau';
  if (coeff >= 60) return 'Moyen';
  if (coeff >= 40) return 'Morte-eau';
  return 'Petite morte-eau';
}
