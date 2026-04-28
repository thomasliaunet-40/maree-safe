import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { Port, TideData, WeatherData, VerdictResult, BoatSettings, BOAT_DEFAULT } from '../types';
import { COLORS } from '../constants/colors';
import { ALL_PORTS } from '../constants/ports';
import { fetchTideData } from '../services/tideService';
import { fetchWeatherData } from '../services/weatherService';
import { saveApiKey, loadApiKey, saveSelectedPortId, loadSelectedPortId } from '../services/storageService';
import { saveBoatProfiles, loadBoatProfiles, saveActiveBoatIndex, loadActiveBoatIndex } from '../services/boatService';
import { calculateVerdict } from '../utils/verdictCalculator';
import { Screen } from '../components/FabNav';

import HomeScreen from '../screens/HomeScreen';
import PortsScreen from '../screens/PortsScreen';
import WeekScreen from '../screens/WeekScreen';
import TideScreen from '../screens/TideScreen';
import BoatScreen from '../screens/BoatScreen';
import ApiKeyModal from '../components/ApiKeyModal';

const DEFAULT_PORT = ALL_PORTS.find(p => p.id === 'boucau-bayonne-biarritz') ?? ALL_PORTS[0];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('home');
  const [port, setPort] = useState<Port>(DEFAULT_PORT);
  const [boats, setBoats] = useState<(BoatSettings | null)[]>([null, null, null]);
  const [activeBoatIndex, setActiveBoatIndex] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tideError, setTideError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const activeBoat = boats[activeBoatIndex] ?? BOAT_DEFAULT;

  useEffect(() => {
    (async () => {
      const [key, portId, profiles, idx] = await Promise.all([
        loadApiKey(), loadSelectedPortId(), loadBoatProfiles(), loadActiveBoatIndex(),
      ]);
      if (key) setApiKey(key);
      if (portId) { const p = ALL_PORTS.find(x => x.id === portId); if (p) setPort(p); }
      setBoats(profiles);
      setActiveBoatIndex(idx);
      setInitialized(true);
    })();
  }, []);

  const loadData = useCallback(async (p: Port, key: string, date: Date, boat: BoatSettings) => {
    setLoading(true);
    setTideError(null);
    setWeatherError(null);

    const [tideRes, weatherRes] = await Promise.allSettled([
      fetchTideData(p, key, date),
      fetchWeatherData(p),
    ]);

    let newTide: TideData | null = null;
    let newWeather: WeatherData | null = null;

    if (tideRes.status === 'fulfilled') {
      newTide = tideRes.value; setTideData(newTide);
    } else {
      const msg = (tideRes.reason as Error).message;
      if (msg === 'CLÉ_API_INVALIDE') { setTideError('Clé API invalide'); setShowApiKey(true); }
      else setTideError(msg);
    }

    if (weatherRes.status === 'fulfilled') {
      newWeather = weatherRes.value; setWeatherData(newWeather);
    } else {
      setWeatherError((weatherRes.reason as Error).message);
    }

    if (newWeather) setVerdict(calculateVerdict(newWeather, boat, date, newTide));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized) loadData(port, apiKey, selectedDate, activeBoat);
  }, [initialized, port, selectedDate]);

  // Recalcule verdict quand le bateau actif change
  useEffect(() => {
    if (weatherData) setVerdict(calculateVerdict(weatherData, activeBoat, selectedDate, tideData));
  }, [boats, activeBoatIndex]);

  const handleBoatsChange = async (next: (BoatSettings | null)[]) => {
    setBoats(next);
    await saveBoatProfiles(next);
  };

  const handleActiveIndexChange = async (index: number) => {
    setActiveBoatIndex(index);
    await saveActiveBoatIndex(index);
  };

  const handlePortSelect = async (p: Port) => {
    setPort(p);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    await saveSelectedPortId(p.id);
  };

  const handleApiKeySave = async (key: string) => {
    setApiKey(key);
    await saveApiKey(key);
    loadData(port, key, selectedDate, activeBoat);
  };

  const handleSelectDate = (d: Date) => {
    const nd = new Date(d); nd.setHours(0, 0, 0, 0);
    setSelectedDate(nd);
    setScreen('home');
  };

  // Bouton retour Android : home d'abord, puis quitter
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'home') { setScreen('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const isToday = isSameDay(selectedDate, new Date());
  const commonProps = { onNav: setScreen };

  return (
    <View style={styles.root}>
      {screen === 'home' && (
        <HomeScreen
          port={port}
          tideData={tideData}
          weatherData={weatherData}
          verdict={verdict}
          loading={loading}
          tideError={tideError}
          weatherError={weatherError}
          boat={activeBoat}
          selectedDate={selectedDate}
          isToday={isToday}
          {...commonProps}
        />
      )}
      {screen === 'ports' && (
        <PortsScreen
          selectedPort={port}
          onSelect={handlePortSelect}
          {...commonProps}
        />
      )}
      {screen === 'week' && (
        <WeekScreen
          weatherData={weatherData}
          boat={activeBoat}
          today={new Date()}
          onSelectDate={handleSelectDate}
          {...commonProps}
        />
      )}
      {screen === 'tide' && (
        <TideScreen
          tideData={tideData}
          selectedDate={selectedDate}
          {...commonProps}
        />
      )}
      {screen === 'boat' && (
        <BoatScreen
          boats={boats}
          activeIndex={activeBoatIndex}
          onBoatsChange={handleBoatsChange}
          onActiveIndexChange={handleActiveIndexChange}
          {...commonProps}
        />
      )}

      <ApiKeyModal
        visible={showApiKey}
        currentKey={apiKey}
        onSave={handleApiKeySave}
        onDismiss={() => setShowApiKey(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
