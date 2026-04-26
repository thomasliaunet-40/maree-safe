import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: 'maree_api_key',
  SELECTED_PORT: 'selected_port_id',
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
