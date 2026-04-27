import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoatSettings, BOAT_DEFAULT } from '../types';

const KEY = 'boat_settings_v1';

export async function saveBoatSettings(boat: BoatSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(boat));
}

export async function loadBoatSettings(): Promise<BoatSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return BOAT_DEFAULT;
    return { ...BOAT_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return BOAT_DEFAULT;
  }
}
