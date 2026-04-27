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
  score: number;           // 0–100
  hourlyScores: number[];  // 24 valeurs pour la timeline
  title: string;
  subtitle: string;
  reasons: string[];
  recommendedWindow: { start: number; end: number } | null; // heures entières
}

export interface BoatSettings {
  type: 'derive' | 'voilier-quillard' | 'cata' | 'hauturier';
  length: number;
  draft: number;
  experience: 'Débutant' | 'Confirmé' | 'Expert';
  maxWind: number;
  maxWaves: number;
}

export const BOAT_DEFAULT: BoatSettings = {
  type: 'voilier-quillard',
  length: 9.5,
  draft: 1.8,
  experience: 'Confirmé',
  maxWind: 25,
  maxWaves: 1.8,
};

export const BOAT_TYPES = [
  { id: 'derive' as const,           label: 'Dériveur',          subtitle: 'Léger, rapide, sensible' },
  { id: 'voilier-quillard' as const, label: 'Voilier quillard',  subtitle: 'Croisière côtière' },
  { id: 'cata' as const,             label: 'Catamaran',          subtitle: 'Stable, vitesse élevée' },
  { id: 'hauturier' as const,        label: 'Voilier hauturier',  subtitle: 'Croisière au large' },
];
