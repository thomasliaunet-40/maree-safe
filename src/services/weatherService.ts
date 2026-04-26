import { Port, WeatherData, HourlyWeather } from '../types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

export async function fetchWeatherData(port: Port): Promise<WeatherData> {
  const { lat, lng } = port;

  const windUrl =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lng}` +
    `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&wind_speed_unit=kn` +
    `&timezone=Europe%2FParis` +
    `&forecast_days=1`;

  const marineUrl =
    `${MARINE_URL}?latitude=${lat}&longitude=${lng}` +
    `&current=wave_height,wave_direction` +
    `&hourly=wave_height,wave_direction` +
    `&timezone=Europe%2FParis` +
    `&forecast_days=1`;

  const [windResp, marineResp] = await Promise.allSettled([
    fetch(windUrl).then(r => r.json()),
    fetch(marineUrl).then(r => r.json()),
  ]);

  if (windResp.status === 'rejected') {
    throw new Error('Impossible de récupérer la météo');
  }

  const wind = windResp.value;

  const currentWind = wind.current ?? {};
  const hourlyWind = wind.hourly ?? {};

  let currentWaveHeight = 0;
  let currentWaveDirection = 0;
  let hourlyWaves: number[] = [];
  let hourlyWaveDirections: number[] = [];

  if (marineResp.status === 'fulfilled' && marineResp.value?.current) {
    const marine = marineResp.value;
    currentWaveHeight = marine.current?.wave_height ?? 0;
    currentWaveDirection = marine.current?.wave_direction ?? 0;
    hourlyWaves = marine.hourly?.wave_height ?? [];
    hourlyWaveDirections = marine.hourly?.wave_direction ?? [];
  }

  const times: string[] = hourlyWind.time ?? [];
  const windSpeeds: number[] = hourlyWind.wind_speed_10m ?? [];
  const windGusts: number[] = hourlyWind.wind_gusts_10m ?? [];
  const windDirections: number[] = hourlyWind.wind_direction_10m ?? [];

  const hourly: HourlyWeather[] = times.map((time, i) => ({
    time,
    windSpeed: windSpeeds[i] ?? 0,
    windGust: windGusts[i] ?? 0,
    windDirection: windDirections[i] ?? 0,
    waveHeight: hourlyWaves[i] ?? 0,
    waveDirection: hourlyWaveDirections[i] ?? 0,
  }));

  return {
    windSpeed: currentWind.wind_speed_10m ?? 0,
    windGust: currentWind.wind_gusts_10m ?? 0,
    windDirection: currentWind.wind_direction_10m ?? 0,
    waveHeight: currentWaveHeight,
    waveDirection: currentWaveDirection,
    hourly,
  };
}
