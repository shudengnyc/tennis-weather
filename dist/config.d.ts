/** One config per group or app: where, which hours count, and the thresholds the wording uses. */
export interface WeatherConfig {
    /** IANA zone the hours are in, e.g. America/Los_Angeles */
    timezone: string;
    points: {
        name: string;
        lat: number;
        lng: number;
    }[];
    /** playing window, local hours: from 11:00, through the 21:00 hour (play ends 21:30) */
    from: number;
    to: number;
    rainProb: number;
    showerProb: number;
    wind: number;
    gust: number;
    aqiBad: number;
    aqiAwful: number;
    wetMm: number;
    hot: number;
    /** °C at `evening` or below = 晚上冷，带件外套. Default 12. */
    cold?: number;
    /** the hour whose temperature the line gives as 「晚上8点」. Default 20 (or the window's last hour if earlier).
     *  null = a daytime group: no second temperature, and 冷 is judged by the high. */
    evening?: number | null;
    /** false = leave out 日落 (a group that is done long before dark). Default true. */
    sunset?: boolean;
    /** km/h gusts at or above this, below `gust` = 有点风. Default 28. */
    breezy?: number;
    /** how far back rain still wets the courts, hours. Default 12 (reaches into last night for the 07:00 line). */
    wetHours?: number;
}
