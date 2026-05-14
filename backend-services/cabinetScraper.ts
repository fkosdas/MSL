import puppeteer, { Browser, Page } from 'puppeteer';

let browserInstance: Browser | null = null;
let pageInstance: Page | null = null;

let lastRestartTime = Date.now();
const RESTART_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

interface SensorData {
  hum: string;
  temp: string;
}

// Cache format: Cache by URL
const cache: Record<string, SensorData> = {};
const cacheTimestamps: Record<string, number> = {};
const CACHE_TTL = 4 * 60 * 1000; // 4 minutes

let isScraping = false;

async function startBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      // ignore
    }
  }
  browserInstance = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  pageInstance = await browserInstance.newPage();
  lastRestartTime = Date.now();
  console.log('[Puppeteer] Singleton browser started.');
}

async function getPage(): Promise<Page> {
  const needsRestart = (Date.now() - lastRestartTime) > RESTART_INTERVAL;
  if (!browserInstance || !pageInstance || needsRestart) {
    await startBrowser();
  }
  return pageInstance!;
}

export async function scrapeCabinetData(targetUrl: string): Promise<{ hum: string; temp: string }> {
  // If cache doesn't exist, initialize with zeros
  if (!cache[targetUrl]) {
    cache[targetUrl] = { hum: '0.0', temp: '0.0' };
    cacheTimestamps[targetUrl] = 0;
  }

  // Use valid cache if fresh
  if (Date.now() - cacheTimestamps[targetUrl] < CACHE_TTL) {
    return cache[targetUrl];
  }

  // Wait if already scraping
  while (isScraping) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Re-check cache after waiting
  if (Date.now() - cacheTimestamps[targetUrl] < CACHE_TTL) {
    return cache[targetUrl];
  }

  isScraping = true;
  console.log(`[Proxy-Puppeteer] Scraping: ${targetUrl}`);

  try {
    const page = await getPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for 5 seconds as Meteor app renders slowly
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      await page.waitForSelector('#spnCRh', { timeout: 5000 });
      await page.waitForSelector('#spnCT', { timeout: 5000 });
    } catch (e) {
      console.warn(`[Proxy-Puppeteer] Selectors not found for ${targetUrl}, using fallback`);
      return cache[targetUrl];
    }
    
    const data = await page.evaluate(() => {
      const hum = document.getElementById('spnCRh')?.textContent?.trim() || '0.0';
      const temp = document.getElementById('spnCT')?.textContent?.trim() || '0.0';
      return { hum, temp };
    });
    
    cache[targetUrl] = data;
    cacheTimestamps[targetUrl] = Date.now();
    return data;
  } catch (error: any) {
    console.error(`[Proxy-Puppeteer Error] URL: ${targetUrl} Message: ${error.message}`);
    if (error.message.includes('Session closed') || error.message.includes('Target closed') || error.message.includes('browser has disconnected')) {
       browserInstance = null;
    }
    return cache[targetUrl];
  } finally {
    isScraping = false;
  }
}
