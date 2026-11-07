import { describe, expect, it } from "vitest";
import type { WeatherConfig } from "../src/config";
import { factsFor, fullText, updateText, type Forecast, type Hour } from "../src/rules";

// The 找场 config at the time of writing (Sunnyvale + Mountain View, 11–21).
const C: WeatherConfig = {
  timezone: "America/Los_Angeles",
  points: [{ name: "Sunnyvale", lat: 37.3688, lng: -122.0363 }, { name: "Mountain View", lat: 37.3861, lng: -122.0839 }],
  from: 11, to: 21, rainProb: 50, showerProb: 30, wind: 25, gust: 40, aqiBad: 100, aqiAwful: 150, wetMm: 0.3, hot: 32,
};

// Yesterday as -24…-1, today 0–23. High 24° at 15:00, 18° otherwise.
const day = (over: (h: number) => Partial<Hour> = () => ({})): Forecast => ({
  sunset: "18:28",
  hours: Array.from({ length: 48 }, (_, i) => i - 24).map((h) =>
    ({ hour: h, temp: h === 15 ? 24 : 18, rainProb: 0, rainMm: 0, wind: 10, gust: 20, aqi: 40, sky: 0, ...over(h) })),
});
const PLAIN = "今天晴，最高 24°C/75°F（下午3点），晚上8点 18°C/64°F，日落 6:28PM";

describe("fullText", () => {
  it("plain morning: sky in words, high and its hour, 8pm, sunset in AM/PM, both units", () =>
    expect(fullText(day(), 7, C)).toBe(`☀️ 早上好！${PLAIN}`));
  it("rain by the hour, and whether it stops before the window ends", () => {
    expect(fullText(day((h) => (h >= 14 && h <= 16 ? { rainProb: 70 } : {})), 7, C)).toBe(`🌧 早上好！${PLAIN}，14–17点可能有雨，之后停`);
    expect(fullText(day((h) => (h >= 19 ? { rainProb: 70 } : {})), 7, C)).toContain("，19点起可能有雨");
    expect(fullText(day((h) => (h >= 19 ? { rainProb: 70 } : {})), 7, C)).not.toContain("之后停");
    expect(fullText(day((h) => (h === 13 || h === 18 ? { rainProb: 60 } : {})), 7, C)).toContain("，13–14点、18–19点可能有雨，之后停");
  });
  it("rain outside 11–21 does not count", () => expect(fullText(day((h) => (h === 8 || h === 22 ? { rainProb: 90 } : {})), 7, C)).toBe(`☀️ 早上好！${PLAIN}`));
  it("wind: sustained 25 or gusts 40 is 风大 with the gust; gusts 28+ is 有点风", () => {
    expect(fullText(day((h) => (h === 17 ? { wind: 25 } : {})), 7, C)).toBe(`💨 早上好！${PLAIN}，风大（阵风 25km/h）`);
    expect(fullText(day((h) => (h === 17 ? { gust: 46.6 } : {})), 7, C)).toContain("，风大（阵风 47km/h）");
    expect(fullText(day((h) => (h === 17 ? { gust: 30 } : {})), 7, C)).toBe(`☀️ 早上好！${PLAIN}，有点风`);
    expect(fullText(day((h) => (h === 17 ? { gust: 27 } : {})), 7, C)).toBe(`☀️ 早上好！${PLAIN}`);
  });
  it("air quality with the AQI", () => {
    expect(fullText(day((h) => (h === 13 ? { aqi: 120 } : {})), 7, C)).toBe(`😷 早上好！${PLAIN}，空气差（AQI 120）`);
    expect(fullText(day((h) => (h === 13 ? { aqi: 160 } : {})), 7, C)).toContain("空气很差（AQI 160），不建议户外");
  });
  it("wet courts: rain overnight shows at 07:00; recent rain later", () => {
    expect(fullText(day((h) => (h === -3 ? { rainMm: 1.2 } : {})), 7, C)).toBe(`☀️ 早上好！${PLAIN}，夜里下过雨，场地可能湿`);
    expect(fullText(day((h) => (h === 10 ? { rainMm: 0.5 } : {})), 12, C)).toContain("，刚下过雨，场地可能湿");
    expect(fullText(day((h) => (h === -6 ? { rainMm: 3 } : {})), 7, C)).not.toContain("场地"); // 13 hours back: dry by now
  });
  it("cold at 8pm: 🥶 and 带件外套; the 8pm hour, not the last of the window", () => {
    expect(fullText(day((h) => (h >= 20 ? { temp: h === 20 ? 9.4 : 7 } : {})), 7, C))
      .toBe("🥶 早上好！今天晴，最高 24°C/75°F（下午3点），晚上8点 9°C/49°F，日落 6:28PM，晚上冷，带件外套");
    expect(fullText(day((h) => (h === 21 ? { temp: 5 } : {})), 7, C)).not.toContain("冷");
    expect(fullText(day((h) => (h === 20 ? { temp: 14 } : {})), 7, { ...C, cold: 15 })).toContain("晚上冷");
  });
  it("sky words from most of the window", () => {
    expect(fullText(day(() => ({ sky: 3 })), 7, C)).toMatch(/^☁️ 早上好！今天阴，/);
    expect(fullText(day((h) => ({ sky: h < 17 ? 2 : 0 })), 7, C)).toMatch(/^⛅ 早上好！今天多云，/);
    expect(fullText(day(() => ({ sky: 45 })), 7, C)).toMatch(/^🌫 早上好！今天有雾，/);
    expect(fullText(day(() => ({ sky: 61 })), 7, C)).toMatch(/^☁️ 早上好！今天阴，/);
  });
  it("30–49% says 可能有小雨 with the highest chance; 50%+ is rain instead", () => {
    expect(fullText(day((h) => (h === 18 ? { rainProb: 30, sky: 3 } : h === 19 ? { rainProb: 27 } : {})), 7, C))
      .toBe(`🌦 早上好！${PLAIN}，18–19点可能有小雨（30%），之后停`);
    expect(fullText(day((h) => (h === 18 ? { rainProb: 29 } : {})), 7, C)).toBe(`☀️ 早上好！${PLAIN}`);
    expect(fullText(day((h) => (h === 13 ? { rainProb: 40 } : h === 18 ? { rainProb: 60 } : {})), 7, C)).toBe(`🌧 早上好！${PLAIN}，18–19点可能有雨，之后停`);
  });
  it("catch-up wording after 11:00 and only the window ahead", () =>
    expect(fullText(day(), 17, C)).toBe("☀️ 今天打球：晴，最高 18°C/64°F（下午5点），晚上8点 18°C/64°F，日落 6:28PM"));
  it("no sunset from the source: left out", () => expect(fullText({ ...day(), sunset: "" }, 7, C)).not.toContain("日落"));
});

describe("updateText", () => {
  const morning = factsFor(day(), 7, C);
  it("nothing changed → silent, even if temperature moved", () => expect(updateText(morning, day(() => ({ temp: 10 })), 12, C)).toBeNull());
  it("rain appears, by the hour", () => expect(updateText(morning, day((h) => (h === 19 ? { rainProb: 80 } : {})), 12, C)).toBe("🔔 天气更新：19–20点可能有雨，之后停"));
  it("rain moves to another part of the day", () =>
    expect(updateText(factsFor(day((h) => (h === 14 ? { rainProb: 80 } : {})), 7, C), day((h) => (h === 19 ? { rainProb: 80 } : {})), 12, C))
      .toBe("🔔 天气更新：雨改了：19–20点可能有雨，之后停"));
  it("a new small chance speaks once; facts saved before showers existed count as none", () => {
    const wet = day((h) => (h === 19 ? { rainProb: 35 } : {}));
    expect(updateText(morning, wet, 12, C)).toBe("🔔 天气更新：19–20点可能有小雨（35%），之后停");
    expect(updateText(factsFor(wet, 7, C), wet, 12, C)).toBeNull();
    expect(updateText(factsFor(wet, 7, C), day(), 12, C)).toBeNull();
    const { shower: _, ...old } = morning; void _;
    expect(updateText(old, wet, 12, C)).toBe("🔔 天气更新：19–20点可能有小雨（35%），之后停");
  });
  it("rain called off", () => expect(updateText(factsFor(day((h) => (h === 19 ? { rainProb: 80 } : {})), 7, C), day(), 12, C)).toBe("🔔 天气更新：之后不太会下雨了"));
  it("afternoon rain that has passed is not news at 17:00", () =>
    expect(updateText(factsFor(day((h) => (h === 14 ? { rainProb: 80 } : {})), 7, C), day((h) => (h === 14 ? { rainProb: 80 } : {})), 17, C)).toBeNull());
  it("overnight wet already said at 07:00 is not repeated at 12:00", () => {
    const night = day((h) => (h === -3 ? { rainMm: 1.2 } : {}));
    expect(updateText(factsFor(night, 7, C), night, 12, C)).toBeNull();
  });
  it("wind, air and wet together", () =>
    expect(updateText(morning, day((h) => (h === 18 ? { gust: 50, aqi: 130 } : h === 15 ? { rainMm: 1 } : {})), 17, C))
      .toBe("🔔 天气更新：风变大了（阵风 50km/h），空气差（AQI 130），刚下过雨，场地可能湿"));
});
