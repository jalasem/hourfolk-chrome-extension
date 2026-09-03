import type { AlarmInfo, AlarmsAdapter } from '@/platform/types';

export interface MemoryAlarmsAdapter extends AlarmsAdapter {
  /** Test helper: simulates the named one-shot alarm firing (Chrome removes it once fired) and returns it. */
  fire(name: string): AlarmInfo | undefined;
}

export function createMemoryAlarmsAdapter(): MemoryAlarmsAdapter {
  const alarms = new Map<string, AlarmInfo>();

  return {
    async create(name, whenMs) {
      alarms.set(name, { name, scheduledTime: whenMs });
    },
    async clear(name) {
      return alarms.delete(name);
    },
    async getAll() {
      return Array.from(alarms.values());
    },
    fire(name) {
      const alarm = alarms.get(name);
      alarms.delete(name);
      return alarm;
    },
  };
}
