import { describe, expect, it } from "vitest";
import type { WeatherConfig } from "../src/config";
import { factsFor, fullText, updateText, type Forecast, type Hour } from "../src/rules";

// The 找场 config at the time of writing (Sunnyvale + Mountain View, 11–21).
const C: WeatherConfig = {
  timezone: "America/Los_Angeles",
  points: [{ name: "Sunnyvale", lat: 37.3688, lng: -122.0363 }, { name: "Mountain View", lat: 37.3861, lng: -122.0839 }],
  from: 11, to: 21, rainProb: 50, showerProb: 30, wind: 25, gust: 40, aqiBad: 100, aqiAwful: 150, wetMm: 0.3, hot: 32,
};

const day = (over: (h: number) => Partial<Hour> = () => ({})): Forecast => ({
  sunset: "18:28",
  hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, temp: h === 15 ? 24 : h === 21 ? 15 : 18, rainProb: 0, rainMm: 0, wind: 10, gust: 20, aqi: 40, sky: 0, ...over(h) })),
});

describe("fullText", () => {
  it("plain morning: high, evening, sunset", () => expect(fullText(day(), 7, C)).toBe("☀️ 早上好！今天最高 24°，晚上 15°，日落 18:28"));
  it("rain by part of the window", () => {
    expect(fullText(day((h) => (h === 18 ? { rainProb: 70 } : {})), 7, C)).toBe("🌧 早上好！今天最高 24°，晚上 15°，日落 18:28，晚上可能有雨");
    expect(fullText(day((h) => (h === 11 || h === 14 || h === 20 ? { rainProb: 60 } : {})), 7, C)).toContain("全天可能有雨");
    expect(fullText(day((h) => (h === 14 || h === 20 ? { rainProb: 60 } : {})), 7, C)).toContain("下午、晚上可能有雨");
  });
  it("rain outside 11–21 does not count", () => expect(fullText(day((h) => (h === 8 || h === 22 ? { rainProb: 90 } : {})), 7, C)).toMatch(/^☀️/));
  it("wind: sustained 25 or gusts 40", () => {
    expect(fullText(day((h) => (h === 17 ? { wind: 25 } : {})), 7, C)).toBe("💨 早上好！今天最高 24°，晚上 15°，日落 18:28，风大");
    expect(fullText(day((h) => (h === 17 ? { gust: 40 } : {})), 7, C)).toContain("风大");
    expect(fullText(day((h) => (h === 17 ? { wind: 24, gust: 39 } : {})), 7, C)).not.toContain("风大");
  });
  it("air quality", () => {
    expect(fullText(day((h) => (h === 13 ? { aqi: 120 } : {})), 7, C)).toBe("😷 早上好！今天最高 24°，晚上 15°，日落 18:28，空气差");
    expect(fullText(day((h) => (h === 13 ? { aqi: 160 } : {})), 7, C)).toContain("空气很差，不建议户外");
  });
  it("wet courts after recent rain", () => expect(fullText(day((h) => (h === 10 ? { rainMm: 0.5 } : {})), 12, C)).toBe("☀️ 今天打球：最高 24°，晚上 15°，日落 18:28，场地可能湿"));
  it("sky icon from most of the window: overcast ☁️, partly cloudy ⛅", () => {
    expect(fullText(day(() => ({ sky: 3 })), 7, C)).toMatch(/^☁️ /);
    expect(fullText(day((h) => ({ sky: h < 17 ? 2 : 0 })), 7, C)).toMatch(/^⛅ /);
    expect(fullText(day(() => ({ sky: 45 })), 7, C)).toMatch(/^☁️ /);
  });
  it("30–49% says 可能有小雨 with the highest chance; 50%+ is rain instead", () => {
    expect(fullText(day((h) => (h === 18 ? { rainProb: 30, sky: 3 } : h === 19 ? { rainProb: 27 } : {})), 7, C))
      .toBe("🌦 早上好！今天最高 24°，晚上 15°，日落 18:28，晚上可能有小雨（30%）");
    expect(fullText(day((h) => (h === 18 ? { rainProb: 29 } : {})), 7, C)).toMatch(/^☀️ .*18:28$/);
    expect(fullText(day((h) => (h === 13 ? { rainProb: 40 } : h === 18 ? { rainProb: 60 } : {})), 7, C)).toBe("🌧 早上好！今天最高 24°，晚上 15°，日落 18:28，晚上可能有雨");
  });
  it("catch-up wording after 11:00 and only the window ahead", () => expect(fullText(day(), 17, C)).toBe("☀️ 今天打球：最高 18°，晚上 15°，日落 18:28"));
});

describe("updateText", () => {
  const morning = factsFor(day(), 7, C);
  it("nothing changed → silent, even if temperature moved", () => expect(updateText(morning, day(() => ({ temp: 10 })), 12, C)).toBeNull());
  it("rain appears", () => expect(updateText(morning, day((h) => (h === 19 ? { rainProb: 80 } : {})), 12, C)).toBe("🔔 天气更新：晚上可能有雨"));
  it("a new small chance speaks once; facts saved before showers existed count as none", () => {
    const wet = day((h) => (h === 19 ? { rainProb: 35 } : {}));
    expect(updateText(morning, wet, 12, C)).toBe("🔔 天气更新：晚上可能有小雨（35%）");
    expect(updateText(factsFor(wet, 7, C), wet, 12, C)).toBeNull();
    expect(updateText(factsFor(wet, 7, C), day(), 12, C)).toBeNull();
    const { shower: _, ...old } = morning; void _;
    expect(updateText(old, wet, 12, C)).toBe("🔔 天气更新：晚上可能有小雨（35%）");
  });
  it("rain called off", () => expect(updateText(factsFor(day((h) => (h === 19 ? { rainProb: 80 } : {})), 7, C), day(), 12, C)).toBe("🔔 天气更新：之后不太会下雨了"));
  it("afternoon rain that has passed is not news at 17:00", () =>
    expect(updateText(factsFor(day((h) => (h === 14 ? { rainProb: 80 } : {})), 7, C), day((h) => (h === 14 ? { rainProb: 80 } : {})), 17, C)).toBeNull());
  it("wind, air and wet together", () =>
    expect(updateText(morning, day((h) => (h === 18 ? { gust: 50, aqi: 130 } : h === 15 ? { rainMm: 1 } : {})), 17, C)).toBe("🔔 天气更新：风变大了，空气差，刚下过雨，场地可能湿"));
});
