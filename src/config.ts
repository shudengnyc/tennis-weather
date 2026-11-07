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
  wetMm: number;    // rain over the last `wetHours` hours = 场地可能湿
  hot: number;      // °C
  /** °C at `evening` or below = 晚上冷，带件外套. Default 12. */
  cold?: number;
  /** the hour whose temperature the line gives as 「晚上8点」. Default 20 (or the window's last hour if earlier). */
  evening?: number;
  /** km/h gusts at or above this, below `gust` = 有点风. Default 28. */
  breezy?: number;
  /** how far back rain still wets the courts, hours. Default 12 (reaches into last night for the 07:00 line). */
  wetHours?: number;
}
