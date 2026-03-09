const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

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
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

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

// --- Google Drive Photo API ---
let driveFileListCache = { files: null, timestamp: 0 };
let drivePhotoCache = { buffer: null, mimeType: null, timestamp: 0 };
const DRIVE_LIST_CACHE_MS = 60 * 60 * 1000; // 1 hour
const DRIVE_PHOTO_CACHE_MS = 15 * 60 * 1000; // 15 min

async function fetchDriveFileList() {
  const auth = getGoogleAuth();
  if (!auth || !GOOGLE_DRIVE_FOLDER_ID) return null;
  try {
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 100
    });
    const files = res.data.files || [];
    driveFileListCache = { files, timestamp: Date.now() };
    console.log(`Drive file list updated: ${files.length} images`);
    return files;
  } catch (error) {
    console.error('Drive file list failed:', error.message);
    return driveFileListCache.files;
  }
}

async function fetchDrivePhoto() {
  let files = driveFileListCache.files;
  if (!files || Date.now() - driveFileListCache.timestamp > DRIVE_LIST_CACHE_MS) {
    files = await fetchDriveFileList();
  }
  if (!files || files.length === 0) return null;

  const file = files[Math.floor(Math.random() * files.length)];
  const auth = getGoogleAuth();
  if (!auth) return null;

  try {
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(res.data);
    drivePhotoCache = { buffer, mimeType: file.mimeType, timestamp: Date.now() };
    console.log(`Drive photo loaded: ${file.name} (${buffer.length} bytes)`);
    return drivePhotoCache;
  } catch (error) {
    console.error('Drive photo fetch failed:', error.message);
    return drivePhotoCache.buffer ? drivePhotoCache : null;
  }
}

app.get('/api/photo', async (req, res) => {
  if (!drivePhotoCache.buffer || Date.now() - drivePhotoCache.timestamp > DRIVE_PHOTO_CACHE_MS) {
    await fetchDrivePhoto();
  }
  if (drivePhotoCache.buffer) {
    res.set('Content-Type', drivePhotoCache.mimeType || 'image/jpeg');
    res.set('Cache-Control', 'no-store');
    res.send(drivePhotoCache.buffer);
  } else {
    res.status(503).send('Photo unavailable');
  }
});

// Pre-fetch photo on startup
fetchDrivePhoto();

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

    const args = [
      '--headless',
      '--no-remote',
      `--window-size=${width},${height}`,
      '--screenshot', tmpFile,
      url
    ];

    execFile(FIREFOX_PATH, args, { timeout: timeoutMs + 10000 }, (error) => {
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
