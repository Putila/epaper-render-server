const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
