import type { WeatherConfig } from "./config.js";

/** One local hour, already the worse of all points (wettest, windiest, worst air, hottest). */
/** sky: WMO weather code (0–1 clear, 2 partly cloudy, 3 overcast, 45/48 fog, higher = some precipitation). */
export interface Hour { hour: number; temp: number; rainProb: number; rainMm: number; wind: number; gust: number; aqi: number | null; sky: number }
export interface Forecast { hours: Hour[]; sunset: string } // sunset "HH:MM" local
/** What a post said, kept on the delivery row so 12:00 and 17:00 only speak when it changed. */
/** shower: parts with a 30–49% hour (not already rain); missing on rows from before it existed = none. */
export interface Facts { rain: Part[]; shower?: Part[]; windy: boolean; air: 0 | 1 | 2; wet: boolean }
type Part = "上午" | "下午" | "晚上";

const PARTS: Part[] = ["上午", "下午", "晚上"];
const partOf = (h: number): Part => (h < 12 ? "上午" : h < 17 ? "下午" : "晚上");
const ahead = (h: Hour, now: number, c: WeatherConfig) => h.hour >= Math.max(c.from, now) && h.hour <= c.to;

/** The rest of today's playing window, from the current hour. Pure. */
export function factsFor(f: Forecast, now: number, c: WeatherConfig): Facts {
  const left = f.hours.filter((h) => ahead(h, now, c));
  const aqi = Math.max(0, ...left.map((h) => h.aqi ?? 0));
  const past = f.hours.filter((h) => h.hour < now && h.hour >= now - 3).reduce((n, h) => n + h.rainMm, 0);
  const rain = PARTS.filter((p) => left.some((h) => h.rainProb >= c.rainProb && partOf(h.hour) === p));
  return {
    rain,
    shower: PARTS.filter((p) => !rain.length && left.some((h) => h.rainProb >= c.showerProb && partOf(h.hour) === p)),
    windy: left.some((h) => h.wind >= c.wind || h.gust >= c.gust),
    air: aqi >= c.aqiAwful ? 2 : aqi >= c.aqiBad ? 1 : 0,
    wet: past >= c.wetMm,
  };
}

const rainWords = (p: Part[]) => (p.length === 3 ? "全天" : p.join("、"));
const AIR = ["", "空气差", "空气很差，不建议户外"];
const showerChance = (left: Hour[], c: WeatherConfig) => Math.max(...left.map((h) => (h.rainProb < c.rainProb ? h.rainProb : 0)));
/** The sky most of the window: ☀️ clear, ⛅ partly cloudy, ☁️ overcast (fog and drizzle codes count as overcast). */
function skyIcon(left: Hour[]): string {
  const n = [0, 0, 0];
  for (const h of left) n[h.sky <= 1 ? 0 : h.sky === 2 ? 1 : 2]++;
  return ["☀️", "⛅", "☁️"][n.indexOf(Math.max(...n))];
}

/** The full line: 07:00, or a catch-up at 12:00 / 17:00 when nothing went out earlier. Pure. */
export function fullText(f: Forecast, now: number, c: WeatherConfig): string {
  const facts = factsFor(f, now, c);
  const left = f.hours.filter((h) => ahead(h, now, c));
  if (!left.length) return "";
  const high = Math.round(Math.max(...left.map((h) => h.temp)));
  const eve = Math.round(left[left.length - 1].temp);
  const shower = facts.shower ?? [];
  const icon = facts.rain.length ? "🌧" : shower.length ? "🌦" : facts.air ? "😷" : facts.windy ? "💨" : high >= c.hot ? "🥵" : skyIcon(left);
  return `${icon} ${now < c.from ? "早上好！今天" : "今天打球："}最高 ${high}°，晚上 ${eve}°，日落 ${f.sunset}` +
    (facts.rain.length ? `，${rainWords(facts.rain)}可能有雨` : "") +
    (shower.length ? `，${rainWords(shower)}可能有小雨（${showerChance(left, c)}%）` : "") +
    (facts.windy ? "，风大" : "") + (facts.air ? `，${AIR[facts.air]}` : "") + (facts.wet ? "，场地可能湿" : "");
}

/** 12:00 / 17:00: only what changed since the last post, for the part of the window still ahead; null = say nothing. */
export function updateText(prev: Facts, f: Forecast, now: number, c: WeatherConfig): string | null {
  const cur = factsFor(f, now, c);
  const stillAhead = (p: Part) => PARTS.indexOf(p) >= PARTS.indexOf(partOf(Math.max(c.from, now)));
  const before = prev.rain.filter(stillAhead);
  const said: string[] = [];
  if (!before.length && cur.rain.length) said.push(`${rainWords(cur.rain)}可能有雨`);
  else if (before.length && !cur.rain.length) said.push("之后不太会下雨了");
  else if (before.join() !== cur.rain.join()) said.push(`雨改到${rainWords(cur.rain)}`);
  // A new 30–49% chance is worth a word; one fading away is not.
  const showerBefore = (prev.shower ?? []).filter(stillAhead), showerNow = cur.shower ?? [];
  if (!cur.rain.length && !before.length && showerNow.some((p) => !showerBefore.includes(p)))
    said.push(`${rainWords(showerNow)}可能有小雨（${showerChance(f.hours.filter((h) => ahead(h, now, c)), c)}%）`);
  if (cur.windy !== prev.windy) said.push(cur.windy ? "风变大了" : "风小了");
  if (cur.air > prev.air) said.push(AIR[cur.air]);
  else if (cur.air < prev.air) said.push(cur.air ? "空气好一点了" : "空气好转了");
  if (cur.wet && !prev.wet) said.push("刚下过雨，场地可能湿");
  return said.length ? `🔔 天气更新：${said.join("，")}` : null;
}
