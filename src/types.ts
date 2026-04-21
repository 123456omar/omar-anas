export interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
    time: string;
    isDay: boolean;
    waveHeight?: number;
    soilMoisture?: number;
  };
  daily: {
    time: string[];
    weatherCode: number[];
    tempMax: number[];
    tempMin: number[];
  };
}

export interface LocationInfo {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  featureCode?: string;
}

export type AlertType = 'heavy_rain' | 'storm' | 'extreme_heat' | 'frost' | 'high_waves' | 'soil_saturation' | 'forest_fire_risk';

export interface AlertConfig {
  id: string;
  location: LocationInfo;
  types: AlertType[];
  enabled: boolean;
}
