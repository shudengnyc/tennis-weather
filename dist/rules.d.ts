import type { WeatherConfig } from "./config.js";
/** One local hour, already the worse of all points (wettest, windiest, worst air, hottest). */
/** sky: WMO weather code (0–1 clear, 2 partly cloudy, 3 overcast, 45/48 fog, higher = some precipitation). */
export interface Hour {
    hour: number;
    temp: number;
    rainProb: number;
    rainMm: number;
    wind: number;
    gust: number;
    aqi: number | null;
    sky: number;
}
/** hours: today 0–23, plus yesterday as -24…-1 when the source has them (for wet courts). sunset "HH:MM" local. */
export interface Forecast {
    hours: Hour[];
    sunset: string;
}
/** What a post said, kept on the delivery row so 12:00 and 17:00 only speak when it changed. */
/** shower: parts with a 30–49% hour (not already rain); missing on rows from before it existed = none. */
export interface Facts {
    rain: Part[];
    shower?: Part[];
    windy: boolean;
    air: 0 | 1 | 2;
    wet: boolean;
}
type Part = "上午" | "下午" | "晚上";
/** The rest of today's playing window, from the current hour. Pure. */
export declare function factsFor(f: Forecast, now: number, c: WeatherConfig): Facts;
/**
 * The full line: 07:00, or a catch-up at 12:00 / 17:00 when nothing went out earlier. Pure.
 * 「☀️ 早上好！今天晴，最高 22°C/71°F（下午2点），晚上8点 13°C/56°F，日落 5:03PM」, then only what is worth a word.
 */
export declare function fullText(f: Forecast, now: number, c: WeatherConfig): string;
/** 12:00 / 17:00: only what changed since the last post, for the part of the window still ahead; null = say nothing. */
export declare function updateText(prev: Facts, f: Forecast, now: number, c: WeatherConfig): string | null;
export {};
