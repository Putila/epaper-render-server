const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');
const multer = require('multer');

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
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=61.5&longitude=23.8&current_weather=true&hourly=temperature_2m&forecast_days=1&timezone=Europe%2FHelsinki';
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
    const cw = raw.current_weather;

    // Extract 3-hourly temperatures for today (06, 09, 12, 15, 18, 21)
    const hourly = [];
    if (raw.hourly && raw.hourly.time && raw.hourly.temperature_2m) {
      const targetHours = [6, 9, 12, 15, 18, 21];
      for (let i = 0; i < raw.hourly.time.length; i++) {
        const hour = new Date(raw.hourly.time[i]).getHours();
        if (targetHours.includes(hour)) {
          hourly.push({ hour, temp: Math.round(raw.hourly.temperature_2m[i]) });
        }
      }
    }

    const data = {
      temp: Math.round(cw.temperature),
      description: WMO_CODES[cw.weathercode] || 'Tuntematon',
      windspeed: Math.round(cw.windspeed),
      is_day: cw.is_day,
      hourly
    };
    weatherCache = { data, timestamp: Date.now() };
    console.log(`Weather updated: ${data.temp}°C, ${data.description}`);
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

// --- Google Calendar API ---
let calendarCache = { data: null, timestamp: 0 };
const CALENDAR_CACHE_MS = 15 * 60 * 1000;

async function fetchCalendarEvents() {
  const auth = getGoogleAuth();
  if (!auth || !GOOGLE_CALENDAR_ID) {
    console.warn('Calendar not configured (missing auth or calendar ID)');
    return null;
  }
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const now = new Date();
    const maxDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: maxDate.toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = (res.data.items || []).map(ev => ({
      summary: ev.summary || '(ei otsikkoa)',
      start: ev.start.dateTime || ev.start.date,
      end: ev.end.dateTime || ev.end.date,
      allDay: !ev.start.dateTime
    }));

    calendarCache = { data: { events }, timestamp: Date.now() };
    console.log(`Calendar updated: ${events.length} events`);
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
  transitUrl: 'https://tremonitori.digitransit.fi/'
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return {
        ...DEFAULT_SETTINGS,
        ...raw,
        gymHours: { ...DEFAULT_SETTINGS.gymHours, ...(raw.gymHours || {}) },
        wordsEnabled: { ...DEFAULT_SETTINGS.wordsEnabled, ...(raw.wordsEnabled || {}) }
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
  res.send(`window.DASHBOARD_SETTINGS = ${JSON.stringify(loadSettings())};`);
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

function takeScreenshot(url, width, height, timeoutMs) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
    const profileDir = path.join(__dirname, 'firefox-profile');

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard (Portrait): http://localhost:${PORT}/`);
  console.log(`Grid Layout (Landscape): http://localhost:${PORT}/grid`);
  console.log(`Screenshot (Portrait): http://localhost:${PORT}/screenshot`);
  console.log(`Screenshot (Grid): http://localhost:${PORT}/screenshot/grid`);
});
