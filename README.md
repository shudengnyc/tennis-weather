# tennis-weather

打球天气 as a library: pure functions an app calls when it builds a post. No server, no schedule, no storage.

```ts
import { fetchForecast, fullText, factsFor, updateText, type WeatherConfig } from "tennis-weather";

const f = await fetchForecast(config);             // Open-Meteo, worst of all points per hour, yesterday + today; one retry; null = try later
const line = f ? fullText(f, hour, config) : "";   // 「☀️ 早上好！今天晴，最高 22°C/71°F（下午2点），晚上8点 13°C/56°F，日落 5:03PM」
const facts = f && factsFor(f, hour, config);      // keep with the post
const update = updateText(lastFacts, f, hour, config); // 12:00 / 17:00: only what changed, or null
```

- Sky in words: 晴 / 多云 / 阴 / 有雾, whichever covers most of the window.
- Temperatures in °C/°F: the high with its hour, and the `evening` hour (default 20 → 晚上8点). Sunset in AM/PM.
- Then only what is worth a word: rain by the hour (「14–17点可能有雨，之后停」, ≥ `rainProb`), 小雨 with its % (≥ `showerProb`),
  风大 with the gust (≥ `wind` / `gust`) or 有点风 (gusts ≥ `breezy`, default 28), 空气差 with the AQI, 场地可能湿 (rain in the
  last `wetHours`, default 12, so last night counts at 07:00), 晚上冷，带件外套 (`evening` temp ≤ `cold`, default 12).
- Icon: 🌧 rain, 🌦 小雨, 😷 air, 💨 wind, 🥵 hot, 🥶 cold, else the sky (☀️ ⛅ ☁️ 🌫).
- Two small requests per check (~5 KB forecast + ~3 KB air), 4 s timeout each, no key.
- The caller owns the schedule and remembers the facts of what it last posted.
- Used by 找场 (shudengnyc/zhaochang) and 约球 Whisman. `dist/` is committed so apps install straight from GitHub:
  `"tennis-weather": "github:shudengnyc/tennis-weather#v0.2.0"`.

Change: edit `src/`, `npm run check`, `npm run build`, commit `dist/`, tag `vX.Y.Z`, bump the tag in each app.
