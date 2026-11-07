const PARTS = ["上午", "下午", "晚上"];
const partOf = (h) => (h < 12 ? "上午" : h < 17 ? "下午" : "晚上");
const ahead = (h, now, c) => h.hour >= Math.max(c.from, now) && h.hour <= c.to;
const COLD = 12, EVENING = 20, BREEZY = 28, WET_HOURS = 12;
/** The rest of today's playing window, from the current hour. Pure. */
export function factsFor(f, now, c) {
    const left = f.hours.filter((h) => ahead(h, now, c));
    const aqi = Math.max(0, ...left.map((h) => h.aqi ?? 0));
    const back = c.wetHours ?? WET_HOURS;
    const past = f.hours.filter((h) => h.hour < now && h.hour >= now - back).reduce((n, h) => n + h.rainMm, 0);
    const rain = PARTS.filter((p) => left.some((h) => h.rainProb >= c.rainProb && partOf(h.hour) === p));
    return {
        rain,
        shower: PARTS.filter((p) => !rain.length && left.some((h) => h.rainProb >= c.showerProb && partOf(h.hour) === p)),
        windy: left.some((h) => h.wind >= c.wind || h.gust >= c.gust),
        air: aqi >= c.aqiAwful ? 2 : aqi >= c.aqiBad ? 1 : 0,
        wet: past >= c.wetMm,
    };
}
/** Rain hours as words: [14,15,16] → 「14–17点」; a run reaching the end of the window → 「19点起」. */
function span(hours, c) {
    const runs = [];
    for (const h of hours) {
        const r = runs[runs.length - 1];
        if (r && h === r[1])
            r[1] = h + 1;
        else
            runs.push([h, h + 1]);
    }
    return runs.map(([a, b]) => (b > c.to ? `${a}点起` : `${a}–${b}点`)).join("、");
}
/** 「14–17点可能有雨，之后停」: the hours at or above `min`, and whether it clears before the window ends. */
function rainWords(left, min, max, c, what) {
    const hs = left.filter((h) => h.rainProb >= min && h.rainProb < max).map((h) => h.hour);
    if (!hs.length)
        return "";
    return `${span(hs, c)}${what}` + (hs[hs.length - 1] < c.to ? "，之后停" : "");
}
const showerChance = (left, c) => Math.max(...left.map((h) => (h.rainProb < c.rainProb ? h.rainProb : 0)));
/** 11 → 上午11点, 12 → 中午12点, 14 → 下午2点, 20 → 晚上8点. */
const clock = (h) => (h < 12 ? `上午${h}点` : h === 12 ? "中午12点" : h < 18 ? `下午${h - 12}点` : `晚上${h - 12}点`);
const temp = (t) => `${Math.round(t)}°C/${Math.round(t * 9 / 5 + 32)}°F`;
/** "17:03" → "5:03PM". */
function ampm(hm) {
    const [h, m] = hm.split(":").map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "AM" : "PM"}` : "";
}
/** The sky most of the window: 晴 ☀️, 多云 ⛅, 阴 ☁️, 有雾 🌫 (drizzle and rain codes count as 阴; rain has its own words). */
function sky(left) {
    const n = [0, 0, 0, 0];
    for (const h of left)
        n[h.sky <= 1 ? 0 : h.sky === 2 ? 1 : h.sky === 45 || h.sky === 48 ? 3 : 2]++;
    const i = n.indexOf(Math.max(...n));
    return { word: ["晴", "多云", "阴", "有雾"][i], icon: ["☀️", "⛅", "☁️", "🌫"][i] };
}
/** The strongest wind of the window, gust or sustained (gusts are normally the higher). */
const gustOf = (left) => Math.round(Math.max(0, ...left.map((h) => Math.max(h.gust, h.wind))));
const aqiOf = (left) => Math.max(0, ...left.map((h) => h.aqi ?? 0));
const airWords = (air, aqi) => ["", `空气差（AQI ${aqi}）`, `空气很差（AQI ${aqi}），不建议户外`][air];
/**
 * The full line: 07:00, or a catch-up at 12:00 / 17:00 when nothing went out earlier. Pure.
 * 「☀️ 早上好！今天晴，最高 22°C/71°F（下午2点），晚上8点 13°C/56°F，日落 5:03PM」, then only what is worth a word.
 */
export function fullText(f, now, c) {
    const facts = factsFor(f, now, c);
    const left = f.hours.filter((h) => ahead(h, now, c));
    if (!left.length)
        return "";
    const top = left.reduce((a, h) => (h.temp > a.temp ? h : a));
    const eveHour = Math.min(c.evening ?? EVENING, c.to);
    const eve = f.hours.find((h) => h.hour === eveHour) ?? left[left.length - 1];
    const cold = eve.temp <= (c.cold ?? COLD);
    const gust = gustOf(left), breezy = !facts.windy && gust >= (c.breezy ?? BREEZY);
    const shower = facts.shower ?? [];
    const s = sky(left);
    const icon = facts.rain.length ? "🌧" : shower.length ? "🌦" : facts.air ? "😷" : facts.windy ? "💨" : top.temp >= c.hot ? "🥵" : cold ? "🥶" : s.icon;
    const sunset = ampm(f.sunset);
    const bits = [
        facts.rain.length ? rainWords(left, c.rainProb, Infinity, c, "可能有雨") : "",
        shower.length ? rainWords(left, c.showerProb, c.rainProb, c, `可能有小雨（${showerChance(left, c)}%）`) : "",
        facts.windy ? `风大（阵风 ${gust}km/h）` : breezy ? "有点风" : "",
        facts.air ? airWords(facts.air, aqiOf(left)) : "",
        facts.wet ? (now < c.from ? "夜里下过雨，场地可能湿" : "刚下过雨，场地可能湿") : "",
        cold ? "晚上冷，带件外套" : "",
    ].filter(Boolean);
    return `${icon} ${now < c.from ? "早上好！今天" : "今天打球："}${s.word}，最高 ${temp(top.temp)}（${clock(top.hour)}），` +
        `${clock(eve.hour)} ${temp(eve.temp)}` + (sunset ? `，日落 ${sunset}` : "") + bits.map((b) => `，${b}`).join("");
}
/** 12:00 / 17:00: only what changed since the last post, for the part of the window still ahead; null = say nothing. */
export function updateText(prev, f, now, c) {
    const cur = factsFor(f, now, c);
    const left = f.hours.filter((h) => ahead(h, now, c));
    const stillAhead = (p) => PARTS.indexOf(p) >= PARTS.indexOf(partOf(Math.max(c.from, now)));
    const before = prev.rain.filter(stillAhead);
    const rainNow = rainWords(left, c.rainProb, Infinity, c, "可能有雨");
    const said = [];
    if (!before.length && cur.rain.length)
        said.push(rainNow);
    else if (before.length && !cur.rain.length)
        said.push("之后不太会下雨了");
    else if (before.join() !== cur.rain.join())
        said.push(`雨改了：${rainNow}`);
    // A new 30–49% chance is worth a word; one fading away is not.
    const showerBefore = (prev.shower ?? []).filter(stillAhead), showerNow = cur.shower ?? [];
    if (!cur.rain.length && !before.length && showerNow.some((p) => !showerBefore.includes(p)))
        said.push(rainWords(left, c.showerProb, c.rainProb, c, `可能有小雨（${showerChance(left, c)}%）`));
    if (cur.windy !== prev.windy)
        said.push(cur.windy ? `风变大了（阵风 ${gustOf(left)}km/h）` : "风小了");
    if (cur.air > prev.air)
        said.push(airWords(cur.air, aqiOf(left)));
    else if (cur.air < prev.air)
        said.push(cur.air ? "空气好一点了" : "空气好转了");
    if (cur.wet && !prev.wet)
        said.push("刚下过雨，场地可能湿");
    return said.length ? `🔔 天气更新：${said.join("，")}` : null;
}
