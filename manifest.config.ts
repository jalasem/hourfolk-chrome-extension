import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

// Optional build variant: `HOURFOLK_NEWTAB=1 vite build` also registers the dashboard as
// Chrome's New Tab page. This is a manifest-level choice and cannot be toggled at runtime.
const newTabVariant = process.env.HOURFOLK_NEWTAB === '1';

export default defineManifest({
  manifest_version: 3,
  name: 'Hourfolk',
  short_name: 'Hourfolk',
  description: 'Your hours, wherever work happens. World clock, time-zone planner, and reminders.',
  homepage_url: 'https://jalasem.github.io/hourfolk-chrome-extension/',
  version: pkg.version,
  minimum_chrome_version: '116',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: 'Hourfolk',
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  options_ui: {
    page: 'dashboard.html',
    open_in_tab: true,
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  permissions: ['storage', 'alarms', 'notifications', 'sidePanel'],
  ...(newTabVariant ? { chrome_url_overrides: { newtab: 'dashboard.html' } } : {}),
});
