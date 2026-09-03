import type { SurfacePreference } from '@/domain/storage/schema';

async function safe(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[hourfolk] ${label} failed`, err);
  }
}

/** Makes the toolbar button behave according to the "Open Hourfolk as" setting. */
export async function applySurfacePreference(surface: SurfacePreference): Promise<void> {
  const popup = surface === 'popup' ? 'popup.html' : '';
  const openPanelOnActionClick = surface === 'sidepanel';
  await safe('setPopup', () => chrome.action.setPopup({ popup }));
  await safe('setPanelBehavior', () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick }));
}

/** Focuses an already-open dashboard tab, or opens a new one. */
export async function openDashboardTab(): Promise<void> {
  await safe('openDashboardTab', async () => {
    const url = chrome.runtime.getURL('dashboard.html');
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
    const existing = contexts[0];
    if (existing && existing.tabId >= 0) {
      await chrome.tabs.update(existing.tabId, { active: true });
      if (existing.windowId >= 0) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url });
    }
  });
}

/** Opens the side panel in a given window. Must be called synchronously from a user gesture. */
export async function openSidePanel(windowId: number): Promise<void> {
  await safe('openSidePanel', () => chrome.sidePanel.open({ windowId }));
}
