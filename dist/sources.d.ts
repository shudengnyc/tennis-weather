import type { WeatherConfig } from "./config.js";
import type { Forecast } from "./rules.js";
/**
 * Yesterday's and today's hours for every point in one forecast call (+ one air-quality call), merged to the worst.
 * Today's hours are 0–23; yesterday's are -24…-1, so rain overnight can still mean wet courts. null = no forecast.
 */
export declare function fetchForecast(c: WeatherConfig): Promise<Forecast | null>;
