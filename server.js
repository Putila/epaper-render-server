const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const WIDTH = parseInt(process.env.WIDTH) || 800;
const HEIGHT = parseInt(process.env.HEIGHT) || 480;

app.use(express.static('public'));

// Grid layout route
app.get('/grid', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'grid.html'));
});

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

app.get('/screenshot', async (req, res) => {
  try {
    const width = parseInt(req.query.width) || WIDTH;
    const height = parseInt(req.query.height) || HEIGHT;

    const browser = await getBrowser();
    const page = await browser.newPage();

    // Disable caching to ensure fresh content
    await page.setCacheEnabled(false);

    await page.setViewport({ width, height });
    await page.goto(`http://localhost:${PORT}/`, {
      waitUntil: 'networkidle0'
    });

    // Wait a bit for iframe content to fully load
    await page.waitForTimeout(10000);

    const screenshot = await page.screenshot({ type: 'png' });
    await page.close();

    // Prevent browser caching of the screenshot
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

    const browser = await getBrowser();
    const page = await browser.newPage();

    // Disable caching to ensure fresh content
    await page.setCacheEnabled(false);

    await page.setViewport({ width, height });
    await page.goto(`http://localhost:${PORT}/grid`, {
      waitUntil: 'networkidle0'
    });

    // Wait a bit for iframe and weather content to fully load
    await page.waitForTimeout(10000);

    const screenshot = await page.screenshot({ type: 'png' });
    await page.close();

    // Prevent browser caching of the screenshot
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
