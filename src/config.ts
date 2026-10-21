/** One config per group or app: where, which hours count, and the thresholds the wording uses. */
export interface WeatherConfig {
  /** IANA zone the hours are in, e.g. America/Los_Angeles */
  timezone: string;
  points: { name: string; lat: number; lng: number }[];
  /** playing window, local hours: from 11:00, through the 21:00 hour (play ends 21:30) */
  from: number;
  to: number;
  rainProb: number; // %, an hour at or above this = 可能有雨
  showerProb: number; // %, below rainProb but at or above this = 可能有小雨（N%）
  wind: number;     // km/h sustained
  gust: number;     // km/h
  aqiBad: number;   // US AQI: 空气差
  aqiAwful: number; // US AQI: 不建议户外
  wetMm: number;    // rain over the last 3 hours = 场地可能湿
  hot: number;      // °C
}
