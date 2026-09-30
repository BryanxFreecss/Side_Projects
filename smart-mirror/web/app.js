// Smart mirror front end. Talks to server.py for config/news/calendar and
// straight to Open-Meteo (free, no API key) for weather.

const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const NEWS_REFRESH_MS = 15 * 60 * 1000;
const CALENDAR_REFRESH_MS = 10 * 60 * 1000;
const GREETING_ROTATE_MS = 30 * 1000;
const FULL_RELOAD_MS = 6 * 60 * 60 * 1000; // picks up config edits, avoids leaks

let config = {};

const $ = (id) => document.getElementById(id);

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Swap text with a quick fade so updates don't flash on the glass.
function fadeText(el, text) {
  if (el.textContent === text) return;
  el.classList.add("fade-out");
  setTimeout(() => {
    el.textContent = text;
    el.classList.remove("fade-out");
  }, 800);
}

// ------------------------------------------------------------- clock

function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  let ampm = "";
  if (!config.clock24h) {
    ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
  } else {
    h = String(h).padStart(2, "0");
  }
  $("time").innerHTML =
    `${h}:${m}<span class="seconds">${s}</span>` +
    (ampm ? `<span class="ampm">${ampm}</span>` : "");
  $("date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ----------------------------------------------------------- weather

// WMO weather codes -> [description, day icon, night icon]
const WEATHER_CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Freezing fog", "🌫️", "🌫️"],
  51: ["Light drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy drizzle", "🌧️", "🌧️"],
  56: ["Freezing drizzle", "🌧️", "🌧️"],
  57: ["Freezing drizzle", "🌧️", "🌧️"],
  61: ["Light rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy rain", "🌧️", "🌧️"],
  66: ["Freezing rain", "🌧️", "🌧️"],
  67: ["Freezing rain", "🌧️", "🌧️"],
  71: ["Light snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy snow", "❄️", "❄️"],
  77: ["Snow grains", "🌨️", "🌨️"],
  80: ["Rain showers", "🌦️", "🌧️"],
  81: ["Rain showers", "🌧️", "🌧️"],
  82: ["Violent showers", "⛈️", "⛈️"],
  85: ["Snow showers", "🌨️", "🌨️"],
  86: ["Snow showers", "❄️", "❄️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm, hail", "⛈️", "⛈️"],
  99: ["Thunderstorm, hail", "⛈️", "⛈️"],
};

function describe(code, isDay = true) {
  const [text, day, night] = WEATHER_CODES[code] || ["Unknown", "❔", "❔"];
  return { text, icon: isDay ? day : night };
}

async function updateWeather() {
  const loc = config.location || {};
  if (loc.latitude == null || loc.longitude == null) {
    $("weather-desc").textContent = "Set location in config.json";
    return;
  }
  const imperial = config.units !== "metric";
  const params = new URLSearchParams({
    latitude: loc.latitude,
    longitude: loc.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    temperature_unit: imperial ? "fahrenheit" : "celsius",
    wind_speed_unit: imperial ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: 5,
  });

  try {
    const data = await getJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
    const c = data.current;
    const d = data.daily;
    const now = describe(c.weather_code, c.is_day === 1);

    $("weather-icon").textContent = now.icon;
    $("weather-temp").textContent = `${Math.round(c.temperature_2m)}°`;
    $("weather-desc").textContent =
      `${now.text}${loc.label ? " · " + loc.label : ""}`;

    const fmtTime = (iso) =>
      new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const sunEvent = c.is_day === 1
      ? `🌇 ${fmtTime(d.sunset[0])}`
      : `🌅 ${fmtTime(d.sunrise[Math.min(1, d.sunrise.length - 1)])}`;
    $("weather-extra").textContent =
      `Feels ${Math.round(c.apparent_temperature)}° · ` +
      `💧 ${c.relative_humidity_2m}% · ` +
      `💨 ${Math.round(c.wind_speed_10m)} ${imperial ? "mph" : "km/h"} · ${sunEvent}`;

    $("forecast").innerHTML = d.time.map((day, i) => {
      const name = i === 0
        ? "Today"
        : new Date(day + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
      const rain = d.precipitation_probability_max?.[i];
      return `<tr>
        <td class="day">${name}</td>
        <td>${describe(d.weather_code[i]).icon}</td>
        <td class="dim">${rain ? rain + "%" : ""}</td>
        <td>${Math.round(d.temperature_2m_max[i])}°</td>
        <td class="low">${Math.round(d.temperature_2m_min[i])}°</td>
      </tr>`;
    }).join("");
  } catch (err) {
    console.error("weather", err);
    $("weather-extra").textContent = "Weather unavailable";
  }
}

// ---------------------------------------------------------- greeting

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function updateGreeting() {
  const pool = (config.compliments || {})[timeOfDay()] || ["Hello!"];
  let text = pool[Math.floor(Math.random() * pool.length)];
  // Occasionally address the user by name.
  if (config.name && Math.random() < 0.4) {
    text = `Good ${timeOfDay() === "night" ? "night" : timeOfDay()}, ${config.name}.`;
  }
  fadeText($("greeting"), text);
}

// -------------------------------------------------------------- news

let headlines = [];
let headlineIndex = 0;

async function updateNews() {
  try {
    const items = await getJSON("/api/news");
    if (Array.isArray(items) && items.length) {
      headlines = items;
      headlineIndex = 0;
      showHeadline();
    }
  } catch (err) {
    console.error("news", err);
  }
}

function showHeadline() {
  if (!headlines.length) return;
  const item = headlines[headlineIndex % headlines.length];
  headlineIndex++;
  fadeText($("news-source"), item.source);
  fadeText($("news-title"), item.title);
}

// ---------------------------------------------------------- calendar

function formatEventTime(ev) {
  const start = new Date(ev.start);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  let day;
  if (start.toDateString() === today.toDateString()) day = "Today";
  else if (start.toDateString() === tomorrow.toDateString()) day = "Tomorrow";
  else day = start.toLocaleDateString(undefined, { weekday: "short" });

  if (ev.allDay) return day;
  return `${day} ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

async function updateCalendar() {
  const calCfg = config.calendar || {};
  const list = $("events");
  if (!calCfg.icsUrls || !calCfg.icsUrls.length) {
    list.closest(".calendar").style.display = "none";
    return;
  }
  try {
    const events = await getJSON("/api/calendar");
    list.innerHTML = events.length
      ? events.map((ev) => `<li>
          <span class="title">${escapeHTML(ev.title)}</span>
          <span class="when">${formatEventTime(ev)}</span>
        </li>`).join("")
      : '<li class="dim">Nothing scheduled</li>';
  } catch (err) {
    console.error("calendar", err);
    list.innerHTML = '<li class="dim">Calendar unavailable</li>';
  }
}

// -------------------------------------------------------------- boot

async function init() {
  try {
    config = await getJSON("/api/config");
  } catch (err) {
    console.error("config", err);
  }

  updateClock();
  setInterval(updateClock, 1000);

  updateGreeting();
  setInterval(updateGreeting, GREETING_ROTATE_MS);

  updateWeather();
  setInterval(updateWeather, WEATHER_REFRESH_MS);

  updateCalendar();
  setInterval(updateCalendar, CALENDAR_REFRESH_MS);

  updateNews();
  setInterval(updateNews, NEWS_REFRESH_MS);
  setInterval(showHeadline, ((config.news || {}).rotateSeconds || 10) * 1000);

  setTimeout(() => location.reload(), FULL_RELOAD_MS);
}

init();
