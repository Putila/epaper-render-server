const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');
const multer = require('multer');
const { initTelegram } = require('./telegram');

// Minimal .env loader (dependency-free). Reads /app/.env into process.env
// without overriding vars already set in the environment. Keeps secrets
// (calendar URL, Telegram token) out of the committed code — see .env.example.
(function loadDotenv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    console.error('Failed to load .env:', e.message);
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;
const WIDTH = parseInt(process.env.WIDTH) || 800;
const HEIGHT = parseInt(process.env.HEIGHT) || 480;
const FIREFOX_PATH = process.env.FIREFOX_PATH || '/usr/local/bin/firefox';

// Default delays (ms) to wait for dynamic content before screenshotting
const PORTRAIT_DELAY = parseInt(process.env.PORTRAIT_DELAY) || 10000;
const GRID_DELAY = parseInt(process.env.GRID_DELAY) || 15000;

app.use(express.static('public'));

// Weather proxy with caching - fetches from Open-Meteo and caches for 15 minutes.
// Client-side JS fetches from /api/weather instead of the external API,
// so weather data loads instantly during screenshots.
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=61.5&longitude=23.8&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,uv_index&daily=uv_index_max,sunrise,sunset,daylight_duration&forecast_days=2&timezone=Europe%2FHelsinki';
let weatherCache = { data: null, timestamp: 0 };
const WEATHER_CACHE_MS = 15 * 60 * 1000;

// WMO weather codes to Finnish descriptions
const WMO_CODES = {
  0: 'Selkeää', 1: 'Enimmäkseen selkeää', 2: 'Puolipilvistä', 3: 'Pilvistä',
  45: 'Sumua', 48: 'Huurresumua',
  51: 'Kevyttä tihkua', 53: 'Tihkusadetta', 55: 'Tiheää tihkua',
  61: 'Heikkoa sadetta', 63: 'Sadetta', 65: 'Rankkasadetta',
  66: 'Jäätävää sadetta', 67: 'Voimakasta jäätävää sadetta',
  71: 'Heikkoa lumisadetta', 73: 'Lumisadetta', 75: 'Voimakasta lumisadetta', 77: 'Lumijyväsiä',
  80: 'Heikkoja kuuroja', 81: 'Kuuroja', 82: 'Voimakkaita kuuroja',
  85: 'Heikkoja lumikuuroja', 86: 'Voimakkaita lumikuuroja',
  95: 'Ukkosmyrsky', 96: 'Ukkosmyrsky ja rakeita', 99: 'Voimakas ukkosmyrsky ja rakeita'
};

async function fetchWeatherData() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(WEATHER_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    const cw = raw.current || {};
    const now = new Date();

    // Upcoming 3-hourly forecast: first future slot, then 6 entries at 3h spacing.
    const times = raw.hourly?.time || [];
    const firstFutureIdx = times.findIndex(t => new Date(t) >= now);
    const hourly = [];
    if (firstFutureIdx !== -1) {
      for (let i = firstFutureIdx; i < times.length && hourly.length < 6; i += 3) {
        const t = new Date(times[i]);
        hourly.push({
          time: times[i],
          hour: t.getHours(),
          temp: Math.round(raw.hourly.temperature_2m?.[i] ?? 0),
          code: raw.hourly.weather_code?.[i] ?? 0,
          precip: Math.round((raw.hourly.precipitation?.[i] ?? 0) * 10) / 10,
          precipProb: Math.round(raw.hourly.precipitation_probability?.[i] ?? 0),
          uv: Math.round((raw.hourly.uv_index?.[i] ?? 0) * 10) / 10
        });
      }
    }

    // Rain for the rest of today: group contiguous precip hours into events.
    const todayKey = now.toISOString().slice(0, 10);
    const events = [];
    let cur = null;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      if (t < now) continue;
      if (t.toISOString().slice(0, 10) !== todayKey) break;
      const mm = raw.hourly.precipitation?.[i] ?? 0;
      if (mm > 0.1) {
        if (!cur) cur = { startHour: t.getHours(), endHour: t.getHours() + 1, totalMm: mm };
        else { cur.endHour = t.getHours() + 1; cur.totalMm += mm; }
      } else if (cur) { events.push(cur); cur = null; }
    }
    if (cur) events.push(cur);
    const rainToday = events.length ? {
      totalMm: Math.round(events.reduce((a, e) => a + e.totalMm, 0) * 10) / 10,
      events: events.map(e => ({ startHour: e.startHour, endHour: e.endHour }))
    } : null;

    // UV max today, only April-September and only if it exceeds the "low" threshold.
    let uvMax = null;
    const month = now.getMonth() + 1;
    if (month >= 4 && month <= 9) {
      const v = raw.daily?.uv_index_max?.[0];
      if (typeof v === 'number' && v > 3) uvMax = Math.round(v * 10) / 10;
    }

    // Sun times for today (daily[0]); ISO strings are already local (timezone param),
    // so the "HH:MM" is just the time slice. daylight_duration is in seconds.
    const sunriseIso = raw.daily?.sunrise?.[0] || null;
    const sunsetIso = raw.daily?.sunset?.[0] || null;
    const sunrise = sunriseIso ? sunriseIso.slice(11, 16) : null;
    const sunset = sunsetIso ? sunsetIso.slice(11, 16) : null;
    const daylightSec = raw.daily?.daylight_duration?.[0];
    const daylightMinutes = typeof daylightSec === 'number' ? Math.round(daylightSec / 60) : null;

    const data = {
      temp: Math.round(cw.temperature_2m ?? 0),
      feelsLike: Math.round(cw.apparent_temperature ?? cw.temperature_2m ?? 0),
      description: WMO_CODES[cw.weather_code] || 'Tuntematon',
      weatherCode: cw.weather_code ?? 0,
      windspeed: Math.round(cw.wind_speed_10m ?? 0),
      is_day: cw.is_day === 1,
      hourly,
      rainToday,
      uvMax,
      sunrise,
      sunset,
      daylightMinutes,
      date: todayKey
    };
    weatherCache = { data, timestamp: Date.now() };
    console.log(`Weather updated: ${data.temp}°C, ${data.description}${rainToday ? `, rain ${rainToday.totalMm}mm` : ''}${uvMax ? `, UV ${uvMax}` : ''}`);
    return data;
  } catch (error) {
    console.error('Weather fetch failed:', error.message);
    return weatherCache.data;
  }
}

app.get('/api/weather', async (req, res) => {
  if (!weatherCache.data || Date.now() - weatherCache.timestamp > WEATHER_CACHE_MS) {
    await fetchWeatherData();
  }
  if (weatherCache.data) {
    res.json(weatherCache.data);
  } else {
    res.status(503).json({ error: 'Weather data unavailable' });
  }
});

// Pre-fetch weather on startup so it's ready for the first screenshot
fetchWeatherData();

// --- Google API Setup ---
const GOOGLE_KEY_FILE = process.env.GOOGLE_KEY_FILE || '/app/google-service-account.json';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

let googleAuth = null;

function getGoogleAuth() {
  if (googleAuth) return googleAuth;
  if (!fs.existsSync(GOOGLE_KEY_FILE)) {
    console.warn('Google service account key not found:', GOOGLE_KEY_FILE);
    return null;
  }
  googleAuth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEY_FILE,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });
  return googleAuth;
}

// --- Calendar ---
// Primary source is a Google Calendar "secret iCal URL" (CALENDAR_ICAL_URL in
// .env) — no Google Cloud project needed. Falls back to the service-account
// API if only that is configured. Times are formatted server-side in
// Europe/Helsinki because the screenshot is rendered by Firefox in the jail,
// whose system timezone is not necessarily local.
const CALENDAR_ICAL_URL = process.env.CALENDAR_ICAL_URL || null;
const CALENDAR_TZ = 'Europe/Helsinki';
const CALENDAR_WINDOW_DAYS = 10;
const CALENDAR_MAX_EVENTS = 5;
let calendarCache = { data: null, timestamp: 0 };
const CALENDAR_CACHE_MS = 15 * 60 * 1000;

const CAL_DAY_FI = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];

// YYYY-MM-DD for a Date in the calendar timezone (for today/tomorrow compare).
function tzDateKey(d) {
  return d.toLocaleDateString('en-CA', { timeZone: CALENDAR_TZ });
}

function formatEventsForDisplay(rawEvents) {
  const now = new Date();
  const todayKey = tzDateKey(now);
  const tomorrowKey = tzDateKey(new Date(now.getTime() + 86400000));
  return rawEvents
    .filter(e => e.end >= now)
    .sort((a, b) => a.start - b.start)
    .slice(0, CALENDAR_MAX_EVENTS)
    .map(e => {
      const key = tzDateKey(e.start);
      let day;
      if (key === todayKey) day = 'Tänään';
      else if (key === tomorrowKey) day = 'Huom.';
      else {
        const wd = new Date(e.start.toLocaleString('en-US', { timeZone: CALENDAR_TZ })).getDay();
        const dm = e.start.toLocaleDateString('fi-FI', { timeZone: CALENDAR_TZ, day: 'numeric', month: 'numeric' });
        day = `${CAL_DAY_FI[wd]} ${dm}`;
      }
      const time = e.allDay ? '' :
        e.start.toLocaleTimeString('fi-FI', { timeZone: CALENDAR_TZ, hour: '2-digit', minute: '2-digit' });
      return { summary: e.summary || '(ei otsikkoa)', day, time, allDay: !!e.allDay };
    });
}

// Expand an iCal feed (incl. recurring events) into concrete occurrences in
// the [now, now+window] range.
function parseIcalEvents(icsText) {
  let ical;
  try { ical = require('node-ical'); }
  catch (e) { console.error('node-ical not installed — run: npm install node-ical'); return []; }

  const parsed = ical.sync.parseICS(icsText);
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 2 * 86400000); // catch ongoing multi-day events
  const rangeEnd = new Date(now.getTime() + CALENDAR_WINDOW_DAYS * 86400000);
  const out = [];

  for (const k in parsed) {
    const ev = parsed[k];
    if (!ev || ev.type !== 'VEVENT') continue;
    const allDay = ev.datetype === 'date';
    const durationMs = (ev.end && ev.start) ? (ev.end - ev.start) : (allDay ? 86400000 : 0);

    if (ev.rrule) {
      const occurrences = ev.rrule.between(rangeStart, rangeEnd, true);
      for (const occ of occurrences) {
        const dayKey = occ.toISOString().slice(0, 10);
        // Skip excluded dates (EXDATE).
        if (ev.exdate && Object.keys(ev.exdate).some(x => x.slice(0, 10) === dayKey)) continue;
        // Apply per-occurrence overrides (modified single instances).
        let start = occ, summary = ev.summary;
        if (ev.recurrences) {
          const ovKey = Object.keys(ev.recurrences).find(x => x.slice(0, 10) === dayKey);
          if (ovKey) { start = ev.recurrences[ovKey].start; summary = ev.recurrences[ovKey].summary || summary; }
        }
        out.push({ summary, start, end: new Date(start.getTime() + durationMs), allDay });
      }
    } else if (ev.start) {
      if (ev.end >= now && ev.start <= rangeEnd) {
        out.push({ summary: ev.summary, start: ev.start, end: ev.end || new Date(ev.start.getTime() + durationMs), allDay });
      }
    }
  }
  return out;
}

async function fetchCalendarFromIcal() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(CALENDAR_ICAL_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseIcalEvents(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCalendarFromGoogle() {
  const auth = getGoogleAuth();
  if (!auth || !GOOGLE_CALENDAR_ID) return null;
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const maxDate = new Date(now.getTime() + CALENDAR_WINDOW_DAYS * 86400000);
  const res = await calendar.events.list({
    calendarId: GOOGLE_CALENDAR_ID, timeMin: now.toISOString(), timeMax: maxDate.toISOString(),
    maxResults: 15, singleEvents: true, orderBy: 'startTime'
  });
  return (res.data.items || []).map(ev => ({
    summary: ev.summary || '(ei otsikkoa)',
    start: new Date(ev.start.dateTime || ev.start.date),
    end: new Date(ev.end.dateTime || ev.end.date),
    allDay: !ev.start.dateTime
  }));
}

async function fetchCalendarEvents() {
  try {
    let raw = null;
    if (CALENDAR_ICAL_URL) raw = await fetchCalendarFromIcal();
    else raw = await fetchCalendarFromGoogle();
    if (raw === null) {
      console.warn('Calendar not configured (no CALENDAR_ICAL_URL and no service account)');
      return null;
    }
    const events = formatEventsForDisplay(raw);
    calendarCache = { data: { events }, timestamp: Date.now() };
    console.log(`Calendar updated: ${events.length} upcoming events (${CALENDAR_ICAL_URL ? 'iCal' : 'Google API'})`);
    return calendarCache.data;
  } catch (error) {
    console.error('Calendar fetch failed:', error.message);
    return calendarCache.data;
  }
}

app.get('/api/calendar', async (req, res) => {
  if (!calendarCache.data || Date.now() - calendarCache.timestamp > CALENDAR_CACHE_MS) {
    await fetchCalendarEvents();
  }
  if (calendarCache.data) {
    res.json(calendarCache.data);
  } else {
    res.status(503).json({ error: 'Calendar data unavailable' });
  }
});

// Pre-fetch calendar on startup
fetchCalendarEvents();

// --- Lunch menus (Juvenes / Jamix) ---
// Saarni = anro 93077 / kitchen 32, Frenckell = anro 93077 / kitchen 33.
const LUNCH_RESTAURANTS = [
  { id: 'saarni', name: 'Saarni', url: 'https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/93077/32?lang=fi' },
  { id: 'frenckell', name: 'Frenckell', url: 'https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/93077/33?lang=fi' }
];
const LUNCH_CACHE_MS = 30 * 60 * 1000;
let lunchCache = { data: null, timestamp: 0 };

function todayYmd() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function stripTags(s) {
  return typeof s === 'string' ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function extractRestaurantMenu(json, ymd) {
  const kitchen = (json || [])[0];
  if (!kitchen) return null;
  for (const mt of kitchen.menuTypes || []) {
    for (const m of mt.menus || []) {
      const day = (m.days || []).find(d => d.date === ymd);
      if (day) {
        const options = (day.mealoptions || []).map(opt => ({
          name: stripTags(opt.name),
          items: (opt.menuItems || []).map(it => stripTags(it.name)).filter(Boolean)
        })).filter(o => o.items.length > 0);
        if (options.length) return { options };
      }
    }
  }
  return { options: [] };
}

async function fetchLunchMenus() {
  const ymd = todayYmd();
  const results = await Promise.all(LUNCH_RESTAURANTS.map(async r => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(r.url, {
        headers: { 'Origin': 'https://juvenes.fi', 'Referer': 'https://juvenes.fi/' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const menu = extractRestaurantMenu(json, ymd);
      return { id: r.id, name: r.name, ...(menu || { options: [] }) };
    } catch (e) {
      console.error(`Lunch fetch ${r.id} failed:`, e.message);
      return { id: r.id, name: r.name, options: [], error: true };
    }
  }));
  lunchCache = { data: { date: ymd, restaurants: results }, timestamp: Date.now() };
  console.log(`Lunch updated: ${results.map(r => `${r.name}=${r.options.length}`).join(', ')}`);
  return lunchCache.data;
}

app.get('/api/lunch', async (req, res) => {
  const stale = !lunchCache.data
    || Date.now() - lunchCache.timestamp > LUNCH_CACHE_MS
    || lunchCache.data.date !== todayYmd();
  if (stale) await fetchLunchMenus();
  if (lunchCache.data) res.json(lunchCache.data);
  else res.status(503).json({ error: 'Lunch data unavailable' });
});

// Pre-fetch lunch on startup
fetchLunchMenus();

// --- Pi ping check ---
// Probes the configured Pi host with ICMP ping (single packet, short timeout).
// Used by the admin page to distinguish "Pi is down" from "render server is down".
function pingHost(host) {
  return new Promise(resolve => {
    if (!host || !/^[a-zA-Z0-9._-]{1,253}$/.test(host)) {
      resolve({ alive: false, error: 'invalid host' });
      return;
    }
    // FreeBSD ping: -c count, -W timeout (ms in modern FreeBSD, seconds in older — use 2s window)
    const args = process.platform === 'win32'
      ? ['-n', '1', '-w', '2000', host]
      : ['-c', '1', '-W', '2', host];
    const start = Date.now();
    execFile('ping', args, { timeout: 4000 }, (err, stdout) => {
      const ms = Date.now() - start;
      if (err) {
        resolve({ alive: false, ms });
        return;
      }
      const m = /time[=<]([\d.]+)\s*ms/i.exec(stdout || '');
      resolve({ alive: true, ms: m ? parseFloat(m[1]) : ms });
    });
  });
}

app.get('/api/ping-pi', async (req, res) => {
  const host = (loadSettings().piHost || '').trim();
  const result = await pingHost(host);
  res.set('Cache-Control', 'no-store');
  res.json({ host, ...result });
});

// --- Automatic Pi monitor with escalation ---
// Normal cadence: ping every 10 min. On a miss, drop to 1-min retries. If the
// Pi stays unreachable for a full 10-min window, restart its display service
// over SSH (only when piAutoRestart is enabled and SSH keys are set up).
const PI_PING_BASE_MS = 10 * 60 * 1000;
const PI_PING_FAST_MS = 60 * 1000;
const PI_FAIL_RESTART_MS = 10 * 60 * 1000;
const PI_RESTART_COOLDOWN_MS = 20 * 60 * 1000;

const piMonitor = {
  lastCheck: 0, alive: null, ms: null,
  failingSince: 0,          // ts of first failure in current streak (0 = healthy)
  lastRestartAt: 0, lastRestartResult: null
};

function restartPiService() {
  const s = loadSettings();
  if (!s.piAutoRestart) return;
  const host = (s.piHost || '').trim();
  const user = (s.piUser || 'pi').trim();
  if (!/^[a-zA-Z0-9._-]{1,253}$/.test(host) || !/^[a-zA-Z0-9._-]{1,32}$/.test(user)) return;
  const now = Date.now();
  if (now - piMonitor.lastRestartAt < PI_RESTART_COOLDOWN_MS) return;
  piMonitor.lastRestartAt = now;
  // Requires a passwordless SSH key (jail -> Pi) and a sudoers entry on the Pi
  // permitting: systemctl restart epaper-dashboard
  const args = [
    '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=accept-new',
    `${user}@${host}`, 'sudo systemctl restart epaper-dashboard'
  ];
  console.log(`Pi unreachable ~10min — restarting display service on ${user}@${host}`);
  execFile('ssh', args, { timeout: 30000 }, (err, stdout, stderr) => {
    piMonitor.lastRestartResult = err
      ? `error: ${((stderr || err.message || '').trim() || 'failed').slice(0, 200)}`
      : 'ok';
    console.log(`Pi service restart: ${piMonitor.lastRestartResult}`);
  });
}

async function piMonitorTick() {
  let nextDelay = PI_PING_BASE_MS;
  try {
    const host = (loadSettings().piHost || '').trim();
    const r = await pingHost(host);
    const now = Date.now();
    piMonitor.lastCheck = now;
    piMonitor.alive = r.alive;
    piMonitor.ms = r.ms ?? null;
    if (r.alive) {
      piMonitor.failingSince = 0;
      nextDelay = PI_PING_BASE_MS;
    } else {
      if (!piMonitor.failingSince) piMonitor.failingSince = now;
      if (now - piMonitor.failingSince >= PI_FAIL_RESTART_MS) restartPiService();
      nextDelay = PI_PING_FAST_MS;
    }
  } catch (e) {
    console.error('Pi monitor tick failed:', e.message);
  } finally {
    setTimeout(piMonitorTick, nextDelay);
  }
}
setTimeout(piMonitorTick, 30 * 1000);

app.get('/api/pi-status', (req, res) => {
  const s = loadSettings();
  res.set('Cache-Control', 'no-store');
  res.json({
    host: s.piHost, user: s.piUser, autoRestart: !!s.piAutoRestart,
    alive: piMonitor.alive, ms: piMonitor.ms,
    lastCheck: piMonitor.lastCheck || null,
    failingSince: piMonitor.failingSince || null,
    lastRestartAt: piMonitor.lastRestartAt || null,
    lastRestartResult: piMonitor.lastRestartResult
  });
});

// --- Local Photo Folder ---
const PHOTO_DIR = process.env.PHOTO_DIR || path.join(__dirname, 'photos');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

if (!fs.existsSync(PHOTO_DIR)) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
}

function listPhotos() {
  return fs.readdirSync(PHOTO_DIR)
    .filter(f => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
    .sort();
}

function isSafeName(name) {
  return name === path.basename(name) && ALLOWED_EXT.has(path.extname(name).toLowerCase());
}

// --- Settings ---
const SETTINGS_FILE = process.env.SETTINGS_FILE || path.join(__dirname, 'settings.json');
const DEFAULT_SETTINGS = {
  gymHours: { start: 8, end: 11 },
  photoRotationMinutes: 15,
  wordRotationMinutes: 10,
  photoOverride: null,
  wordsEnabled: { spanish: true, korean: true, japanese: true },
  transitUrl: 'https://tremonitori.digitransit.fi/',
  simpleWeatherEnabled: true,
  advancedWeatherEnabled: false,
  lunchEnabled: true,
  lunchHours: { start: 6, end: 11 },
  calendarEnabled: true,
  boardPlacement: 'off',                                   // off | strip | replace | alternate
  boardSections: { memos: true, dinner: true, shopping: true },
  boardTopics: { memos: '', meals: '', shopping: '' },     // Telegram forum-topic ids
  piHost: '192.168.1.100',
  piUser: 'pi',
  piAutoRestart: false
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return {
        ...DEFAULT_SETTINGS,
        ...raw,
        gymHours: { ...DEFAULT_SETTINGS.gymHours, ...(raw.gymHours || {}) },
        lunchHours: { ...DEFAULT_SETTINGS.lunchHours, ...(raw.lunchHours || {}) },
        wordsEnabled: { ...DEFAULT_SETTINGS.wordsEnabled, ...(raw.wordsEnabled || {}) },
        boardSections: { ...DEFAULT_SETTINGS.boardSections, ...(raw.boardSections || {}) },
        boardTopics: { ...DEFAULT_SETTINGS.boardTopics, ...(raw.boardTopics || {}) }
      };
    }
  } catch (e) {
    console.error('Failed to read settings, using defaults:', e.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function validateSettings(partial, current) {
  const next = { ...current };
  if (partial.gymHours && typeof partial.gymHours === 'object') {
    next.gymHours = {
      start: clampInt(partial.gymHours.start, 0, 23, current.gymHours.start),
      end: clampInt(partial.gymHours.end, 0, 24, current.gymHours.end)
    };
  }
  if (partial.photoRotationMinutes !== undefined) {
    next.photoRotationMinutes = clampInt(partial.photoRotationMinutes, 1, 1440, current.photoRotationMinutes);
  }
  if (partial.wordRotationMinutes !== undefined) {
    next.wordRotationMinutes = clampInt(partial.wordRotationMinutes, 0, 1440, current.wordRotationMinutes);
  }
  if (partial.photoOverride !== undefined) {
    const v = partial.photoOverride;
    next.photoOverride = (v && isSafeName(v) && fs.existsSync(path.join(PHOTO_DIR, v))) ? v : null;
  }
  if (partial.wordsEnabled && typeof partial.wordsEnabled === 'object') {
    next.wordsEnabled = { ...current.wordsEnabled };
    for (const k of ['spanish', 'korean', 'japanese']) {
      if (typeof partial.wordsEnabled[k] === 'boolean') next.wordsEnabled[k] = partial.wordsEnabled[k];
    }
  }
  if (partial.transitUrl !== undefined) {
    const v = partial.transitUrl;
    if (typeof v === 'string' && /^https?:\/\//i.test(v) && v.length < 2000) {
      next.transitUrl = v;
    } else if (v === null || v === '') {
      next.transitUrl = DEFAULT_SETTINGS.transitUrl;
    }
  }
  if (typeof partial.simpleWeatherEnabled === 'boolean') {
    next.simpleWeatherEnabled = partial.simpleWeatherEnabled;
  }
  if (typeof partial.advancedWeatherEnabled === 'boolean') {
    next.advancedWeatherEnabled = partial.advancedWeatherEnabled;
  }
  if (typeof partial.lunchEnabled === 'boolean') {
    next.lunchEnabled = partial.lunchEnabled;
  }
  if (typeof partial.calendarEnabled === 'boolean') {
    next.calendarEnabled = partial.calendarEnabled;
  }
  if (['off', 'strip', 'replace', 'alternate'].includes(partial.boardPlacement)) {
    next.boardPlacement = partial.boardPlacement;
  }
  if (partial.boardSections && typeof partial.boardSections === 'object') {
    next.boardSections = { ...current.boardSections };
    for (const k of ['memos', 'dinner', 'shopping']) {
      if (typeof partial.boardSections[k] === 'boolean') next.boardSections[k] = partial.boardSections[k];
    }
  }
  if (partial.boardTopics && typeof partial.boardTopics === 'object') {
    next.boardTopics = { ...current.boardTopics };
    for (const k of ['memos', 'meals', 'shopping']) {
      const v = partial.boardTopics[k];
      if (v === '' || v === null) next.boardTopics[k] = '';
      else if (/^-?\d{1,20}$/.test(String(v))) next.boardTopics[k] = String(v);
    }
  }
  if (partial.lunchHours && typeof partial.lunchHours === 'object') {
    next.lunchHours = {
      start: clampInt(partial.lunchHours.start, 0, 23, current.lunchHours.start),
      end: clampInt(partial.lunchHours.end, 0, 24, current.lunchHours.end)
    };
  }
  if (partial.piHost !== undefined) {
    const v = partial.piHost;
    if (typeof v === 'string' && /^[a-zA-Z0-9._-]{1,253}$/.test(v.trim())) {
      next.piHost = v.trim();
    } else if (v === null || v === '') {
      next.piHost = DEFAULT_SETTINGS.piHost;
    }
  }
  if (partial.piUser !== undefined) {
    const v = partial.piUser;
    if (typeof v === 'string' && /^[a-zA-Z0-9._-]{1,32}$/.test(v.trim())) {
      next.piUser = v.trim();
    } else if (v === null || v === '') {
      next.piUser = DEFAULT_SETTINGS.piUser;
    }
  }
  if (typeof partial.piAutoRestart === 'boolean') {
    next.piAutoRestart = partial.piAutoRestart;
  }
  return next;
}

app.use(express.json());

app.get('/api/settings', (req, res) => {
  res.json(loadSettings());
});

app.post('/api/settings', (req, res) => {
  const current = loadSettings();
  const next = validateSettings(req.body || {}, current);
  saveSettings(next);
  res.json(next);
});

// Settings exposed as a JS global so client pages can read synchronously
app.get('/api/settings.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.set('Cache-Control', 'no-store');
  // Provide the current Helsinki hour computed server-side. The screenshot
  // browser in the jail has an unreliable local timezone, so client-side
  // new Date().getHours() can't be trusted for the gym/lunch time windows.
  const hh = parseInt(new Date().toLocaleString('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', hour12: false }), 10);
  const hourExpr = Number.isFinite(hh) ? hh : 'new Date().getHours()';
  res.send(
    `window.DASHBOARD_SETTINGS = ${JSON.stringify(loadSettings())};\n` +
    `window.DASHBOARD_NOW = { hour: ${hourExpr} };`
  );
});

// --- Telegram "home board" ---
// The bot polls in the background (only if TELEGRAM_BOT_TOKEN is set) and stores
// memos/dinner/shopping; /api/board exposes it to the display widget.
const telegram = initTelegram(() => ({ topics: loadSettings().boardTopics || {} }));

app.get('/api/board', (req, res) => {
  const s = loadSettings();
  const b = telegram.getBoard();
  const fmt = ts => {
    try { return new Date(ts).toLocaleTimeString('fi-FI', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  };
  res.set('Cache-Control', 'no-store');
  res.json({
    placement: s.boardPlacement || 'off',
    sections: { memos: true, dinner: true, shopping: true, ...(s.boardSections || {}) },
    memos: (b.memos || []).map(m => ({ text: m.text, from: m.from || '', time: m.ts ? fmt(m.ts) : '' })),
    dinner: b.dinner ? { text: b.dinner.text } : null,
    shopping: (b.shopping || []).map(i => ({ text: i.text, done: !!i.done }))
  });
});

// --- Photo rotation (sticky + override) ---
let stickyPhoto = { file: null, pickedAt: 0 };

function currentPhotoFile() {
  const settings = loadSettings();
  if (settings.photoOverride) {
    const p = path.join(PHOTO_DIR, settings.photoOverride);
    if (fs.existsSync(p)) return settings.photoOverride;
  }
  const files = listPhotos();
  if (files.length === 0) return null;
  const rotationMs = settings.photoRotationMinutes * 60 * 1000;
  const stale = !stickyPhoto.file
    || !files.includes(stickyPhoto.file)
    || Date.now() - stickyPhoto.pickedAt > rotationMs;
  if (stale) {
    stickyPhoto = { file: files[Math.floor(Math.random() * files.length)], pickedAt: Date.now() };
  }
  return stickyPhoto.file;
}

app.get('/api/photo', (req, res) => {
  const file = currentPhotoFile();
  if (!file) {
    res.status(404).send('No photos available');
    return;
  }
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(PHOTO_DIR, file));
});

app.get('/api/photos', (req, res) => {
  res.json({ files: listPhotos() });
});

app.get('/photos/file/:name', (req, res) => {
  const name = req.params.name;
  if (!isSafeName(name)) {
    res.status(400).send('Invalid filename');
    return;
  }
  const filePath = path.join(PHOTO_DIR, name);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('Not found');
    return;
  }
  res.sendFile(filePath);
});

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: PHOTO_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        cb(new Error('Unsupported file type'));
        return;
      }
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${base}${ext}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

app.post('/api/photos', (req, res) => {
  photoUpload.array('photos', 20)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ uploaded: (req.files || []).map(f => f.filename) });
  });
});

app.delete('/api/photos/:name', (req, res) => {
  const name = req.params.name;
  if (!isSafeName(name)) {
    res.status(400).send('Invalid filename');
    return;
  }
  const filePath = path.join(PHOTO_DIR, name);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('Not found');
    return;
  }
  fs.unlinkSync(filePath);
  res.json({ deleted: name });
});

app.get('/photos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'photos.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Grid layout route
app.get('/grid', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'grid.html'));
});

// Delayed image endpoint - returns a 1x1 transparent PNG after a delay.
// Used by capture pages to block the load event until content has time to render.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==', 'base64'
);

app.get('/delay-image', (req, res) => {
  const ms = Math.min(parseInt(req.query.ms) || 10000, 60000);
  setTimeout(() => {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    res.send(TRANSPARENT_PNG);
  }, ms);
});

// Capture pages - wrapper pages that load the actual page in an iframe
// and include a delayed image to prevent the load event from firing too early.
// Firefox --screenshot waits for the load event, so this ensures dynamic content
// (iframes, weather API, etc.) has time to render before the screenshot is taken.
function capturePageHtml(srcPath, delayMs) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;overflow:hidden">
<iframe src="${srcPath}" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0"></iframe>
<img src="/delay-image?ms=${delayMs}" style="position:absolute;width:1px;height:1px;opacity:0">
</body></html>`;
}

app.get('/capture', (req, res) => {
  const delay = parseInt(req.query.delay) || PORTRAIT_DELAY;
  res.send(capturePageHtml('/', delay));
});

app.get('/capture/grid', (req, res) => {
  const delay = parseInt(req.query.delay) || GRID_DELAY;
  res.send(capturePageHtml('/grid', delay));
});

// Kill Firefox processes older than maxAgeSec. A screenshot that times out gets
// SIGKILLed, but that can orphan child (content) processes which then pile up
// over weeks and eventually exhaust memory — a prime suspect for the server
// wedging. Anything older than ~90s is well past a normal screenshot, so it's
// safe to reap without touching an in-flight capture.
function sweepStaleFirefox(maxAgeSec = 90) {
  if (process.platform === 'win32') return;
  execFile('ps', ['-axo', 'pid=,etimes=,command='], { timeout: 5000 }, (err, stdout) => {
    if (err || !stdout) return;
    for (const line of stdout.split('\n')) {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      const [, pid, etimes, command] = m;
      if (/firefox/i.test(command) && parseInt(etimes, 10) > maxAgeSec) {
        try { process.kill(parseInt(pid, 10), 'SIGKILL'); } catch (e) { /* gone already */ }
      }
    }
  });
}

function takeScreenshot(url, width, height, timeoutMs) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
    const profileDir = path.join(__dirname, 'firefox-profile');

    // Reap any orphaned Firefox left from earlier runs before starting a new one.
    sweepStaleFirefox();

    // A previous Firefox that hit the timeout may have left .parentlock behind.
    // If it's still there, a fresh Firefox refuses to start with "profile in use".
    try { fs.unlinkSync(path.join(profileDir, '.parentlock')); } catch (e) { /* ignore */ }

    const args = [
      '--headless',
      '--no-remote',
      '--profile', profileDir,
      `--window-size=${width},${height}`,
      '--screenshot', tmpFile,
      url
    ];

    execFile(FIREFOX_PATH, args, { timeout: timeoutMs + 10000, killSignal: 'SIGKILL' }, (error) => {
      if (error && !fs.existsSync(tmpFile)) {
        reject(new Error(`Firefox screenshot failed: ${error.message}`));
        return;
      }

      try {
        const imageBuffer = fs.readFileSync(tmpFile);
        fs.unlinkSync(tmpFile);
        resolve(imageBuffer);
      } catch (readError) {
        reject(new Error(`Failed to read screenshot: ${readError.message}`));
      }
    });
  });
}

app.get('/screenshot', async (req, res) => {
  try {
    const width = parseInt(req.query.width) || 480;
    const height = parseInt(req.query.height) || 800;

    const screenshot = await takeScreenshot(
      `http://localhost:${PORT}/capture`,
      width, height, PORTRAIT_DELAY
    );

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(screenshot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Screenshot failed');
  }
});

app.get('/screenshot/grid', async (req, res) => {
  try {
    const width = parseInt(req.query.width) || WIDTH;
    const height = parseInt(req.query.height) || HEIGHT;

    const screenshot = await takeScreenshot(
      `http://localhost:${PORT}/capture/grid`,
      width, height, GRID_DELAY
    );

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(screenshot);
  } catch (error) {
    console.error(error);
    res.status(500).send('Screenshot failed');
  }
});

// Lightweight liveness probe. Responds fast even while a screenshot is running
// (Firefox runs as a child process, so the event loop stays free), which lets
// the watchdog tell a healthy-but-busy server apart from a crashed/hung one.
app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('text/plain').send('ok');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard (Portrait): http://localhost:${PORT}/`);
  console.log(`Grid Layout (Landscape): http://localhost:${PORT}/grid`);
  console.log(`Screenshot (Portrait): http://localhost:${PORT}/screenshot`);
  console.log(`Screenshot (Grid): http://localhost:${PORT}/screenshot/grid`);
});
