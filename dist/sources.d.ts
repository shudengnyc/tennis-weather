import type { WeatherConfig } from "./config.js";
import type { Forecast } from "./rules.js";
/** Today's hours for every point in one forecast call (+ one air-quality call), merged to the worst. null = no forecast. */
export declare function fetchForecast(c: WeatherConfig): Promise<Forecast | null>;
