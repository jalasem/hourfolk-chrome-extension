import type { AlarmsAdapter } from '@/platform/types';

/** Wraps `chrome.alarms` behind the platform-neutral `AlarmsAdapter` contract. */
export function createChromeAlarmsAdapter(): AlarmsAdapter {
  return {
    async create(name, whenMs) {
      await chrome.alarms.create(name, { when: whenMs });
    },
    async clear(name) {
      return chrome.alarms.clear(name);
    },
    async getAll() {
      const alarms = await chrome.alarms.getAll();
      return alarms.map((alarm) => ({ name: alarm.name, scheduledTime: alarm.scheduledTime }));
    },
  };
}
