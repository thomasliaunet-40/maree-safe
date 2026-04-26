import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Port, TideData, WeatherData, VerdictResult } from '../types';
import { COLORS } from '../constants/colors';
import { ALL_PORTS } from '../constants/ports';
import { fetchTideData } from '../services/tideService';
import { fetchWeatherData } from '../services/weatherService';
import { saveApiKey, loadApiKey, saveSelectedPortId, loadSelectedPortId } from '../services/storageService';
import { calculateVerdict } from '../utils/verdictCalculator';
import VerdictBanner from '../components/VerdictBanner';
import TideCard from '../components/TideCard';
import WeatherCard from '../components/WeatherCard';
import PortSelector from '../components/PortSelector';
import ApiKeyModal from '../components/ApiKeyModal';
import DateStrip from '../components/DateStrip';

const DEFAULT_PORT = ALL_PORTS.find(p => p.id === 'boucau-bayonne-biarritz')!;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const [selectedPort, setSelectedPort] = useState<Port>(DEFAULT_PORT);
  const [apiKey, setApiKey] = useState('');
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tideError, setTideError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Chargement des préférences sauvegardées
  useEffect(() => {
    (async () => {
      const [savedKey, savedPortId] = await Promise.all([loadApiKey(), loadSelectedPortId()]);
      if (savedKey) setApiKey(savedKey);
      if (savedPortId) {
        const port = ALL_PORTS.find(p => p.id === savedPortId);
        if (port) setSelectedPort(port);
      }
      setInitialized(true);
    })();
  }, []);

  const loadData = useCallback(
    async (port: Port, key: string, date: Date, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setTideError(null);
      setWeatherError(null);

      const [tideResult, weatherResult] = await Promise.allSettled([
        fetchTideData(port, key, date),
        fetchWeatherData(port),
      ]);

      let newTide: TideData | null = null;
      let newWeather: WeatherData | null = null;

      if (tideResult.status === 'fulfilled') {
        newTide = tideResult.value;
        setTideData(newTide);
      } else {
        const msg = (tideResult.reason as Error).message;
        if (msg === 'CLÉ_API_INVALIDE') {
          setTideError('Clé API invalide ou expirée');
          setShowApiKeyModal(true);
        } else {
          setTideError(msg);
        }
      }

      if (weatherResult.status === 'fulfilled') {
        newWeather = weatherResult.value;
        setWeatherData(newWeather);
      } else {
        setWeatherError((weatherResult.reason as Error).message);
      }

      if (newWeather) {
        setVerdict(calculateVerdict(newWeather, newTide));
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  // Charger les données au démarrage, quand le port ou la date change
  useEffect(() => {
    if (initialized) {
      loadData(selectedPort, apiKey, selectedDate);
    }
  }, [initialized, selectedPort, selectedDate]);

  const handlePortChange = async (port: Port) => {
    setSelectedPort(port);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    await saveSelectedPortId(port.id);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleApiKeySave = async (key: string) => {
    setApiKey(key);
    await saveApiKey(key);
  };

  const isToday = isSameDay(selectedDate, new Date());
  const displayDate = formatDateFR(selectedDate);
  const displayDateFormatted = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

  return (
    <View style={styles.root}>
      {/* Header fixe */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>🌊 MaréeSafe</Text>
          <Text style={styles.date}>{displayDateFormatted}</Text>
        </View>
        <View style={styles.headerRight}>
          <PortSelector selectedPort={selectedPort} onSelect={handlePortChange} />
          <TouchableOpacity
            style={styles.keyButton}
            onPress={() => setShowApiKeyModal(true)}
          >
            <Ionicons
              name="key-outline"
              size={18}
              color={apiKey ? COLORS.green : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendrier de sélection de date */}
      <DateStrip
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
      />

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(selectedPort, apiKey, selectedDate, true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !tideData && !weatherData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Récupération des données…</Text>
          </View>
        ) : (
          <>
            {/* Avis MaréeSafe + graphique vertical */}
            {verdict && (
              <VerdictBanner
                verdict={verdict}
                tidePoints={tideData?.points ?? []}
                hourlyWeather={
                  weatherData?.hourly.filter(h =>
                    h.time.startsWith(
                      `${selectedDate.getFullYear()}-` +
                      `${String(selectedDate.getMonth() + 1).padStart(2, '0')}-` +
                      `${String(selectedDate.getDate()).padStart(2, '0')}`
                    )
                  ) ?? []
                }
                isToday={isToday}
              />
            )}

            {/* Météo marine */}
            {weatherData && <WeatherCard data={weatherData} />}
            {weatherError && (
              <ErrorCard
                message={weatherError}
                icon="partly-sunny-outline"
                onRetry={() => loadData(selectedPort, apiKey, selectedDate)}
              />
            )}

            {/* Marées — horaires PM/BM + coefficient */}
            {tideData && <TideCard data={tideData} isToday={isToday} />}
            {tideError && (
              <ErrorCard
                message={tideError}
                icon="water-outline"
                onRetry={() => loadData(selectedPort, apiKey, selectedDate)}
              />
            )}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Données marées : api-maree.fr · Météo : Open-Meteo
          </Text>
        </View>
      </ScrollView>

      <ApiKeyModal
        visible={showApiKeyModal}
        currentKey={apiKey}
        onSave={handleApiKeySave}
        onDismiss={() => setShowApiKeyModal(false)}
      />
    </View>
  );
}

// --- Sous-composants locaux ---

interface ErrorCardProps {
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  onRetry: () => void;
}

function ErrorCard({ message, icon, hint, onRetry }: ErrorCardProps) {
  return (
    <View style={errorStyles.card}>
      <View style={errorStyles.row}>
        <Ionicons name={icon} size={20} color={COLORS.orange} />
        <View style={errorStyles.texts}>
          <Text style={errorStyles.message}>{message}</Text>
          {hint && <Text style={errorStyles.hint}>{hint}</Text>}
        </View>
      </View>
      <TouchableOpacity style={errorStyles.retry} onPress={onRetry}>
        <Ionicons name="refresh" size={14} color={COLORS.primary} />
        <Text style={errorStyles.retryText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

function NoApiKeyCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={noKeyStyles.card} onPress={onPress}>
      <Ionicons name="water-outline" size={24} color={COLORS.textMuted} />
      <Text style={noKeyStyles.title}>Données de marée non configurées</Text>
      <Text style={noKeyStyles.text}>
        Appuyez pour entrer votre clé API api-maree.fr gratuite
      </Text>
      <View style={noKeyStyles.button}>
        <Ionicons name="key-outline" size={14} color={COLORS.primary} />
        <Text style={noKeyStyles.buttonText}>Configurer la clé API</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  footer: {
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

const errorStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  texts: {
    flex: 1,
    gap: 4,
  },
  message: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  retryText: {
    fontSize: 13,
    color: COLORS.primary,
  },
});

const noKeyStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  buttonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
