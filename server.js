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
