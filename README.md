# tennis-weather

打球天气 as a library: pure functions an app calls when it builds a post. No server, no schedule, no storage.

```ts
import { fetchForecast, fullText, factsFor, updateText, type WeatherConfig } from "tennis-weather";

const f = await fetchForecast(config);             // Open-Meteo, worst of all points per hour; one retry; null = try later
const line = f ? fullText(f, hour, config) : "";   // 「☁️ 今天打球：最高 21°，晚上 18°，日落 18:22」
const facts = f && factsFor(f, hour, config);      // keep with the post
const update = updateText(lastFacts, f, hour, config); // 12:00 / 17:00: only what changed, or null
```

- Icon: 🌧 rain (≥ `rainProb`), 🌦 小雨 (≥ `showerProb`, shows the %), 😷 air, 💨 wind, 🥵 hot, else the sky (☀️ ⛅ ☁️).
- The caller owns the schedule and remembers the facts of what it last posted.
- Used by 找场 (shudengnyc/zhaochang) and 约球 Whisman. `dist/` is committed so apps install straight from GitHub:
  `"tennis-weather": "github:shudengnyc/tennis-weather#v0.1.0"`.

Change: edit `src/`, `npm run check`, `npm run build`, commit `dist/`, tag `vX.Y.Z`, bump the tag in each app.
