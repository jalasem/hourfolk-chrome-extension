import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStorageArea } from '@/platform';
import { STORAGE_KEYS, type AdvanceMinutes } from '@/domain/storage/schema';
import { isIsoDate, isIsoTime } from '@/domain/time/iso';
import type { Disambiguation, IsoDate, IsoTime } from '@/domain/time/types';

export type View = 'clocks' | 'plan' | 'reminders';

export interface PlanSource {
  timeZone: string;
  cityLabel: string;
  cityLocation: string;
  cityId?: string;
  time: IsoTime;
  /** Explicit date; undefined means "next occurrence". */
  date?: IsoDate | undefined;
  prefer: Disambiguation;
}

export interface ReminderDraft {
  id?: string;
  title: string;
  timeZone: string;
  cityLabel: string;
  cityLocation: string;
  cityId?: string;
  date: IsoDate;
  time: IsoTime;
  prefer: Disambiguation;
  advanceMinutes?: AdvanceMinutes[];
}

interface AppStateValue {
  view: View;
  setView(view: View): void;
  planSource: PlanSource | null;
  setPlanSource(source: PlanSource | null): void;
  planQuery: string;
  setPlanQuery(query: string): void;
  reminderDraft: ReminderDraft | null;
  openReminderDraft(draft: ReminderDraft | null): void;
  settingsOpen: boolean;
  setSettingsOpen(open: boolean): void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

interface PersistedUiState {
  view: View;
  planSource: PlanSource | null;
  planQuery: string;
  reminderDraft: ReminderDraft | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePlanSource(value: unknown): PlanSource | null {
  if (!isRecord(value) || typeof value.timeZone !== 'string' || typeof value.cityLabel !== 'string'
    || typeof value.cityLocation !== 'string' || typeof value.time !== 'string' || !isIsoTime(value.time)
    || (value.date !== undefined && (typeof value.date !== 'string' || !isIsoDate(value.date)))
    || (value.prefer !== 'earlier' && value.prefer !== 'later')) return null;
  return {
    timeZone: value.timeZone,
    cityLabel: value.cityLabel,
    cityLocation: value.cityLocation,
    time: value.time,
    prefer: value.prefer,
    ...(typeof value.cityId === 'string' ? { cityId: value.cityId } : {}),
    ...(value.date === undefined ? {} : { date: value.date }),
  };
}

function normalizeDraft(value: unknown): ReminderDraft | null {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.timeZone !== 'string'
    || typeof value.cityLabel !== 'string' || typeof value.cityLocation !== 'string'
    || typeof value.date !== 'string' || !isIsoDate(value.date)
    || typeof value.time !== 'string' || !isIsoTime(value.time)
    || (value.prefer !== 'earlier' && value.prefer !== 'later')) return null;
  const advanceMinutes = [30, 15, 10, 5].filter((minutes) => Array.isArray(value.advanceMinutes) && value.advanceMinutes.includes(minutes)) as AdvanceMinutes[];
  return {
    title: value.title,
    timeZone: value.timeZone,
    cityLabel: value.cityLabel,
    cityLocation: value.cityLocation,
    date: value.date,
    time: value.time,
    prefer: value.prefer,
    ...(typeof value.id === 'string' ? { id: value.id } : {}),
    ...(typeof value.cityId === 'string' ? { cityId: value.cityId } : {}),
    ...(advanceMinutes.length ? { advanceMinutes } : {}),
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('clocks');
  const [planSource, setPlanSource] = useState<PlanSource | null>(null);
  const [planQuery, setPlanQuery] = useState('');
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getStorageArea().get([STORAGE_KEYS.uiState]).then((stored) => {
      if (cancelled) return;
      const raw = stored[STORAGE_KEYS.uiState];
      if (isRecord(raw)) {
        if (raw.view === 'clocks' || raw.view === 'plan' || raw.view === 'reminders') setView(raw.view);
        setPlanSource(normalizePlanSource(raw.planSource));
        setPlanQuery(typeof raw.planQuery === 'string' ? raw.planQuery : '');
        setReminderDraft(normalizeDraft(raw.reminderDraft));
      }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persisted: PersistedUiState = { view, planSource, planQuery, reminderDraft };
    void getStorageArea().set({ [STORAGE_KEYS.uiState]: persisted });
  }, [hydrated, view, planSource, planQuery, reminderDraft]);

  const openReminderDraft = useCallback((draft: ReminderDraft | null) => {
    setReminderDraft(draft);
    if (draft) setView('reminders');
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({ view, setView, planSource, setPlanSource, planQuery, setPlanQuery, reminderDraft, openReminderDraft, settingsOpen, setSettingsOpen }),
    [view, planSource, planQuery, reminderDraft, openReminderDraft, settingsOpen],
  );
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
