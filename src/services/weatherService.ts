import { LocationInfo, WeatherData } from '../types';

export const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'سماء صافية', icon: 'Sun' },
  1: { label: 'صافٍ غالباً', icon: 'CloudSun' },
  2: { label: 'غائم جزئياً', icon: 'CloudSun' },
  3: { label: 'غائم', icon: 'Cloud' },
  45: { label: 'ضباب', icon: 'CloudFog' },
  48: { label: 'ضباب كثيف', icon: 'CloudFog' },
  51: { label: 'رذاذ خفيف', icon: 'CloudDrizzle' },
  53: { label: 'رذاذ متوسط', icon: 'CloudDrizzle' },
  55: { label: 'رذاذ كثيف', icon: 'CloudDrizzle' },
  61: { label: 'أمطار خفيفة', icon: 'CloudRain' },
  63: { label: 'أمطار متوسطة', icon: 'CloudRain' },
  65: { label: 'أمطار غزيرة', icon: 'CloudRain' },
  71: { label: 'ثلوج خفيفة', icon: 'Snowflake' },
  73: { label: 'ثلوج متوسطة', icon: 'Snowflake' },
  75: { label: 'ثلوج كثيفة', icon: 'Snowflake' },
  80: { label: 'زخات مطر خفيفة', icon: 'CloudRainWind' },
  81: { label: 'زخات مطر متوسطة', icon: 'CloudRainWind' },
  82: { label: 'زخات مطر غزيرة', icon: 'CloudRainWind' },
  95: { label: 'عواصف رعدية', icon: 'CloudLightning' },
};

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m,soil_moisture_0_to_7cm&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height&timezone=auto`;
  
  const [weatherRes, marineRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(marineUrl)
  ]);
  
  const weatherData = await weatherRes.json();
  const marineData = await marineRes.json().catch(() => ({}));

  return {
    current: {
      temp: weatherData.current.temperature_2m,
      weatherCode: weatherData.current.weather_code,
      windSpeed: weatherData.current.wind_speed_10m,
      humidity: weatherData.current.relative_humidity_2m,
      time: weatherData.current.time,
      isDay: weatherData.current.is_day === 1,
      waveHeight: marineData.current?.wave_height,
      soilMoisture: weatherData.current?.soil_moisture_0_to_7cm,
    },
    daily: {
      time: weatherData.daily.time,
      weatherCode: weatherData.daily.weather_code,
      tempMax: weatherData.daily.temperature_2m_max,
      tempMin: weatherData.daily.temperature_2m_min,
    },
  };
}

export async function searchLocation(query: string): Promise<LocationInfo[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ar&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.results) return [];
  
  return data.results.map((item: any) => ({
    name: item.name,
    country: item.country,
    latitude: item.latitude,
    longitude: item.longitude,
    elevation: item.elevation,
    featureCode: item.feature_code,
  }));
}
