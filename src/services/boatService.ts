import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoatSettings, BOAT_DEFAULT } from '../types';

const PROFILES_KEY = 'boat_profiles_v1';
const ACTIVE_INDEX_KEY = 'boat_active_index_v1';
const LEGACY_KEY = 'boat_settings_v1';

export async function saveBoatProfiles(profiles: (BoatSettings | null)[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function loadBoatProfiles(): Promise<(BoatSettings | null)[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (raw) {
      const data = JSON.parse(raw) as (BoatSettings | null)[];
      // Garantit exactement 3 slots
      return [data[0] ?? null, data[1] ?? null, data[2] ?? null];
    }
    // Migration depuis l'ancienne clé single-boat
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const boat: BoatSettings = { ...BOAT_DEFAULT, ...JSON.parse(legacy) };
      return [boat, null, null];
    }
    return [null, null, null];
  } catch {
    return [null, null, null];
  }
}

export async function saveActiveBoatIndex(index: number): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_INDEX_KEY, String(index));
}

export async function loadActiveBoatIndex(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_INDEX_KEY);
    if (!raw) return 0;
    const i = parseInt(raw, 10);
    return isNaN(i) ? 0 : Math.min(2, Math.max(0, i));
  } catch {
    return 0;
  }
}
