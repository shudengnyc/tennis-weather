/** One retry right away; still nothing = null, and the next run inside the slot's window tries again. */
async function get(url) {
    return (await getOnce(url)) ?? getOnce(url);
}
async function getOnce(url) {
    try {
        const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!r.ok)
            return null;
        const d = await r.json();
        return Array.isArray(d) ? d : [d];
    }
    catch {
        return null;
    }
}
/**
 * Yesterday's and today's hours for every point in one forecast call (+ one air-quality call), merged to the worst.
 * Today's hours are 0–23; yesterday's are -24…-1, so rain overnight can still mean wet courts. null = no forecast.
 */
export async function fetchForecast(c) {
    const tzq = `timezone=${encodeURIComponent(c.timezone)}&past_days=1&forecast_days=1`;
    const lat = c.points.map((p) => p.lat).join(","), lng = c.points.map((p) => p.lng).join(",");
    const [wx, air] = await Promise.all([
        get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&${tzq}&daily=sunset` +
            `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,weather_code`),
        get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&${tzq}&hourly=us_aqi`),
    ]);
    if (!wx?.every((p) => p.hourly?.time?.length))
        return null;
    const times = wx[0].hourly.time;
    const today = times[times.length - 1].slice(0, 10);
    const airAt = (t) => (air ?? []).map((p) => { const j = p.hourly?.time?.indexOf(t) ?? -1; return Number(p.hourly?.us_aqi?.[j]); })
        .filter(Number.isFinite);
    const hours = times.map((t, i) => {
        const each = (k) => wx.map((p) => Number(p.hourly?.[k]?.[i])).filter(Number.isFinite);
        const aqi = airAt(t);
        return { hour: Number(t.slice(11, 13)) - (t.startsWith(today) ? 0 : 24), temp: Math.max(...each("temperature_2m")),
            rainProb: Math.max(0, ...each("precipitation_probability")), rainMm: Math.max(0, ...each("precipitation")),
            wind: Math.max(0, ...each("wind_speed_10m")), gust: Math.max(0, ...each("wind_gusts_10m")),
            aqi: aqi.length ? Math.max(...aqi) : null, sky: Math.max(0, ...each("weather_code")) };
    });
    const sunsets = (wx[0].daily?.sunset ?? []);
    return { hours, sunset: String(sunsets.find((s) => s.startsWith(today)) ?? sunsets[sunsets.length - 1] ?? "").slice(11, 16) };
}
