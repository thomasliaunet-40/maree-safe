import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: 'maree_api_key',
  SELECTED_PORT: 'selected_port_id',
  FAVORITES: 'favorite_port_ids_v1',
};

export async function saveApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.API_KEY, key);
}

export async function loadApiKey(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.API_KEY)) ?? '';
}

export async function saveSelectedPortId(portId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.SELECTED_PORT, portId);
}

export async function loadSelectedPortId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.SELECTED_PORT);
}

const DEFAULT_FAVORITES = ['boucau-bayonne-biarritz', 'lorient', 'concarneau', 'la-rochelle', 'saint-malo'];

export async function saveFavoritePortIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(ids));
}

export async function loadFavoritePortIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FAVORITES);
    if (raw) return JSON.parse(raw) as string[];
    return DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}
