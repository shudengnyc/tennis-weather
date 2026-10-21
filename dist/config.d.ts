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
}
