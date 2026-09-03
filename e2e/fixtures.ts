import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

/** Local zone used by every headless run so expectations are deterministic. */
export const LOCAL_ZONE = 'Asia/Muscat';

interface Fixtures {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  errors: string[];
  openSurface: (surface: 'popup' | 'sidepanel' | 'dashboard', size?: { width: number; height: number }) => Promise<Page>;
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!fs.existsSync(path.join(distDir, 'manifest.json'))) {
      throw new Error('dist/manifest.json missing — run `pnpm build` before the e2e suite');
    }
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hourfolk-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      timezoneId: LOCAL_ZONE,
      locale: 'en-US',
      args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`],
    });
    try {
      await use(context);
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },
  worker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    const id = worker.url().split('/')[2];
    if (!id) throw new Error(`Unexpected service worker url ${worker.url()}`);
    await use(id);
  },
  errors: async ({ context, worker }, use) => {
    const errors: string[] = [];
    worker.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[worker] ${msg.text()}`);
    });
    context.on('page', (page) => {
      page.on('pageerror', (err) => errors.push(`[page] ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`[page] ${msg.text()}`);
      });
    });
    await use(errors);
  },
  openSurface: async ({ context, extensionId }, use) => {
    const sizes = { popup: { width: 380, height: 600 }, sidepanel: { width: 360, height: 780 }, dashboard: { width: 1280, height: 800 } };
    await use(async (surface, size) => {
      const page = await context.newPage();
      await page.setViewportSize(size ?? sizes[surface]);
      await page.goto(`chrome-extension://${extensionId}/${surface}.html`);
      await page.getByText('Hourfolk', { exact: true }).first().waitFor();
      return page;
    });
  },
});

export const expect = test.expect;
