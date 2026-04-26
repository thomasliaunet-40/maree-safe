export interface Port {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  refMarnage: number; // marnage moyen de référence en mètres (pour coefficient K=70)
}

export interface TidePoint {
  time: string; // ISO timestamp
  height: number; // mètres
}

export interface TidePeak {
  type: 'high' | 'low';
  time: string;
  height: number;
  label: string; // "PM" ou "BM"
}

export interface TideData {
  port: string;
  points: TidePoint[];
  peaks: TidePeak[];
  coefficient: number;
  currentHeight: number;
  isRising: boolean;
}

export interface HourlyWeather {
  time: string;
  windSpeed: number;   // nœuds
  windGust: number;    // nœuds
  windDirection: number; // degrés
  waveHeight: number;  // mètres
  waveDirection: number; // degrés
}

export interface WeatherData {
  windSpeed: number;
  windGust: number;
  windDirection: number;
  waveHeight: number;
  waveDirection: number;
  hourly: HourlyWeather[];
}

export type VerdictLevel = 'green' | 'orange' | 'red';

export interface VerdictResult {
  level: VerdictLevel;
  title: string;
  subtitle: string;
  reasons: string[];
  recommendedWindow: { start: string; end: string; level: VerdictLevel } | null;
}

export interface AppState {
  selectedPort: Port | null;
  tideData: TideData | null;
  weatherData: WeatherData | null;
  verdict: VerdictResult | null;
  loading: boolean;
  tideError: string | null;
  weatherError: string | null;
  apiKey: string;
}
