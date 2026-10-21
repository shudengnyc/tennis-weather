import type { WeatherConfig } from "./config.js";
import type { Forecast, Hour } from "./rules.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** One retry right away; still nothing = null, and the next run inside the slot's window tries again. */
async function get(url: string): Promise<Json[] | null> {
  return (await getOnce(url)) ?? getOnce(url);
}

async function getOnce(url: string): Promise<Json[] | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d : [d];
  } catch { return null; }
}

/** Today's hours for every point in one forecast call (+ one air-quality call), merged to the worst. null = no forecast. */
export async function fetchForecast(c: WeatherConfig): Promise<Forecast | null> {
  const tzq = `timezone=${encodeURIComponent(c.timezone)}&forecast_days=1`;
  const lat = c.points.map((p) => p.lat).join(","), lng = c.points.map((p) => p.lng).join(",");
  const [wx, air] = await Promise.all([
    get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&${tzq}&daily=sunset` +
      `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,weather_code`),
    get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&${tzq}&hourly=us_aqi`),
  ]);
  if (!wx?.every((p) => p.hourly?.time?.length)) return null;
  const hours: Hour[] = (wx[0].hourly.time as string[]).map((t, i) => {
    const each = (k: string, src: Json[] | null = wx) => (src ?? []).map((p) => Number(p.hourly?.[k]?.[i])).filter(Number.isFinite);
    const aqi = each("us_aqi", air);
    return { hour: Number(t.slice(11, 13)), temp: Math.max(...each("temperature_2m")), rainProb: Math.max(0, ...each("precipitation_probability")),
      rainMm: Math.max(0, ...each("precipitation")), wind: Math.max(0, ...each("wind_speed_10m")), gust: Math.max(0, ...each("wind_gusts_10m")),
      aqi: aqi.length ? Math.max(...aqi) : null, sky: Math.max(0, ...each("weather_code")) };
  });
  return { hours, sunset: String(wx[0].daily?.sunset?.[0] ?? "").slice(11, 16) };
}
