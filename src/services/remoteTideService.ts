import AsyncStorage from '@react-native-async-storage/async-storage';
import { TidePoint } from '../types';
import { TIDES_BASE_URL } from '../constants/config';

interface PortCache {
  updatedAt: string;
  port: string;
  points: TidePoint[];
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_PREFIX = 'tides_v1:';
const FETCH_TIMEOUT_MS = 10_000;

function datePrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadFromStorage(portId: string): Promise<PortCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${portId}`);
    if (!raw) return null;
    const entry: PortCache = JSON.parse(raw);
    const age = Date.now() - new Date(entry.updatedAt).getTime();
    return age < CACHE_TTL_MS ? entry : null;
  } catch {
    return null;
  }
}

async function fetchFromServer(portId: string): Promise<PortCache> {
  const url = `${TIDES_BASE_URL}/tides/${portId}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: PortCache = await response.json();
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${portId}`, JSON.stringify(data));
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function getPointsForDate(portId: string, date: Date): Promise<TidePoint[] | null> {
  // 1. Cache AsyncStorage (< 24h)
  let entry = await loadFromStorage(portId);

  // 2. Fetch depuis le serveur Vercel si pas de cache frais
  if (!entry) {
    try {
      entry = await fetchFromServer(portId);
    } catch {
      return null;
    }
  }

  // 3. Filtrer sur la date demandée
  const prefix = datePrefix(date);
  const points = entry.points.filter(p => p.time.startsWith(prefix));
  return points.length > 0 ? points : null;
}
