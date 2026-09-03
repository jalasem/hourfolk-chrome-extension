// Renders scripts/icon.svg to the PNG sizes the manifest needs using Playwright's Chromium.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'scripts/icon.svg'), 'utf8');
const outDir = path.join(root, 'public/icons');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace(
      /width="128" height="128"/,
      `width="${size}" height="${size}"`,
    )}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(path.join(outDir, `icon-${size}.png`), png);
  console.log(`wrote public/icons/icon-${size}.png`);
}
await browser.close();
