import { chromium } from '@playwright/test';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'store-listing/assets-src/promo-small.svg');
const outputDir = path.join(root, 'store-listing/assets');
const svg = await readFile(source, 'utf8');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;overflow:hidden">${svg}</body></html>`);
  const png = await page.screenshot({ type: 'png' });
  await writeFile(path.join(outputDir, 'promo-small-440x280.png'), png);
  await copyFile(path.join(root, 'public/icons/icon-128.png'), path.join(outputDir, 'icon-128.png'));
  console.log('wrote store-listing/assets/promo-small-440x280.png');
  console.log('wrote store-listing/assets/icon-128.png');
} finally {
  await browser.close();
}
