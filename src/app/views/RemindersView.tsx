import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/app/providers/StoreProvider';
import { useAppState, type ReminderDraft } from '@/app/providers/AppStateProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useNow } from '@/app/hooks/useNow';
import { abbreviationFallback, describeLocalLocation } from '@/app/lib/local';
import { formatRelative } from '@/app/lib/relative';
import { getNotificationPermissionLevel, type NotificationPermissionLevel } from '@/platform/chrome/notification-permission';
import type { AdvanceMinutes, Reminder } from '@/domain/storage/schema';
import { createReminder, effectiveTargetMs } from '@/domain/reminders';
import type { CityEntry } from '@/domain/cities/types';
import { getDeviceTimeZone, todayInZone } from '@/domain/time/zone-clock';
import { describeInstant, formatIsoTime } from '@/domain/time/format';
import { resolveWallClock } from '@/domain/time/resolve';
import { addDays } from '@/domain/time/iso';
import type { Disambiguation } from '@/domain/time/types';
import { Button, IconButton } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { Field } from '@/app/components/Field';
import { Notice } from '@/app/components/Notice';
import { Segmented } from '@/app/components/Segmented';
import { EmptyState } from '@/app/components/EmptyState';
import { ReminderOrbitIllustration } from '@/app/components/EmptyStateIllustrations';
import { CityCombobox } from '@/app/components/CityCombobox';
import { BellIcon, CheckIcon, ClockIcon, PauseIcon, PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '@/app/components/Icons';
import inputStyles from '@/app/components/inputs.module.css';
import styles from './RemindersView.module.css';

const ADVANCE_OPTIONS: readonly AdvanceMinutes[] = [30, 15, 10, 5];

export function RemindersView() {
  const { state, actions } = useStore();
  const { reminderDraft, openReminderDraft } = useAppState();
  const { notify } = useToast();
  const now = useNow('minute');
  const localZone = useMemo(getDeviceTimeZone, []);
  const local = useMemo(() => describeLocalLocation(localZone), [localZone]);
  const { hourCycle } = state.settings;
  const [permission, setPermission] = useState<NotificationPermissionLevel>('unknown');

  useEffect(() => {
    void getNotificationPermissionLevel().then(setPermission);
  }, []);

  const blankDraft = (): ReminderDraft => ({
    title: '',
    timeZone: localZone,
    cityLabel: local.name,
    cityLocation: local.detail,
    date: todayInZone(localZone, now),
    time: nextRoundHour(now, localZone),
    prefer: 'earlier',
  });

  const closeForm = () => {
    openReminderDraft(null);
  };

  const sorted = useMemo(() => [...state.reminders].sort((a, b) => effectiveTargetMs(a) - effectiveTargetMs(b)), [state.reminders]);
  const upcoming = sorted.filter((r) => r.enabled && !r.firedAt && effectiveTargetMs(r) > now);
  const overdue = sorted.filter((r) => r.enabled && !r.firedAt && effectiveTargetMs(r) <= now);
  const paused = sorted.filter((r) => !r.enabled && !r.firedAt);
  const delivered = sorted.filter((r) => Boolean(r.firedAt)).reverse();

  const edit = (reminder: Reminder) => {
    openReminderDraft({
      id: reminder.id,
      title: reminder.title,
      timeZone: reminder.timeZone,
      cityLabel: reminder.cityLabel,
      cityLocation: '',
      date: reminder.requestedDate,
      time: reminder.requestedTime,
      prefer: 'earlier',
      ...(reminder.advanceMinutes === undefined ? {} : { advanceMinutes: reminder.advanceMinutes }),
    });
  };

  return (
    <section id="view-reminders" role="tabpanel" aria-labelledby="tab-reminders" className={styles.view}>
      {permission === 'denied' ? (
        <Notice tone="danger" title="Notifications are turned off">
          <p>Chrome is blocking notifications from Hourfolk, so reminders can’t be shown. Turn them back on in Chrome’s notification settings for extensions.</p>
        </Notice>
      ) : null}

      {reminderDraft ? (
        <ReminderForm
          key={reminderDraft?.id ?? 'new'}
          draft={reminderDraft}
          existing={reminderDraft?.id ? state.reminders.find((r) => r.id === reminderDraft.id) : undefined}
          now={now}
          localZone={localZone}
          localName={local.name}
          hourCycle={hourCycle}
          onDraftChange={openReminderDraft}
          onCancel={closeForm}
          onSave={async (reminder) => {
            await actions.saveReminder(reminder);
            notify(reminderDraft?.id ? 'Reminder updated' : 'Reminder saved');
            closeForm();
          }}
        />
      ) : state.reminders.length > 0 ? (
        <Button variant="primary" icon={<PlusIcon />} onClick={() => openReminderDraft(blankDraft())} block>
          New reminder
        </Button>
      ) : null}

      {state.reminders.length === 0 && !reminderDraft ? (
        <EmptyState
          title="Never miss the moment"
          illustration={<ReminderOrbitIllustration />}
          action={
            <Button variant="primary" icon={<PlusIcon />} onClick={() => openReminderDraft(blankDraft())}>
              New reminder
            </Button>
          }
        >
          <p>Create an at-time alarm and, if you want, an early notification 5–30 minutes beforehand.</p>
        </EmptyState>
      ) : null}

      <ReminderGroup title="Overdue" reminders={overdue} now={now} localZone={localZone} hourCycle={hourCycle} onEdit={edit} tone="danger" />
      <ReminderGroup title="Upcoming" reminders={upcoming} now={now} localZone={localZone} hourCycle={hourCycle} onEdit={edit} />
      <ReminderGroup title="Paused" reminders={paused} now={now} localZone={localZone} hourCycle={hourCycle} onEdit={edit} />
      <ReminderGroup title="Delivered" reminders={delivered} now={now} localZone={localZone} hourCycle={hourCycle} onEdit={edit} />

      <aside className={styles.deliveryNote} aria-label="How reminder alerts work">
        <span className={styles.deliveryIcon}><BellIcon size={16} /></span>
        <span>
          <strong>Delivered by Chrome.</strong> Chrome must be running; sleeping devices alert after they wake.
        </span>
      </aside>
    </section>
  );
}

function nextRoundHour(nowMs: number, zone: string): string {
  const d = describeInstant(nowMs + 60 * 60 * 1000, zone, { hourCycle: '24h' });
  return `${d.isoTime.slice(0, 2)}:00`;
}

interface ReminderFormProps {
  draft: ReminderDraft;
  existing: Reminder | undefined;
  now: number;
  localZone: string;
  localName: string;
  hourCycle: '12h' | '24h';
  onCancel(): void;
  onDraftChange(draft: ReminderDraft): void;
  onSave(reminder: Reminder): Promise<void>;
}

function ReminderForm({ draft, existing, now, localZone, localName, hourCycle, onCancel, onDraftChange, onSave }: ReminderFormProps) {
  const [title, setTitle] = useState(draft.title);
  const [city, setCity] = useState<CityEntry>({
    id: draft.cityId ?? `zone:${draft.timeZone}`,
    kind: draft.cityId ? 'city' : 'zone',
    name: draft.cityLabel,
    country: draft.cityLocation,
    countryCode: '',
    timeZone: draft.timeZone,
  });
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(draft.time);
  const [prefer, setPrefer] = useState<Disambiguation>(draft.prefer);
  const [advanceMinutes, setAdvanceMinutes] = useState<AdvanceMinutes[]>(draft.advanceMinutes ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resolution = useMemo(() => {
    try {
      return resolveWallClock({ timeZone: city.timeZone, date, time, prefer });
    } catch {
      return null;
    }
  }, [city.timeZone, date, time, prefer]);
  const targetMs = resolution?.epochMs ?? null;
  const inPast = targetMs !== null && targetMs <= now;
  const cityDescription = targetMs !== null ? describeInstant(targetMs, city.timeZone, { hourCycle, abbreviationFallback }) : null;
  const localDescription = targetMs !== null ? describeInstant(targetMs, localZone, { hourCycle, abbreviationFallback }) : null;

  useEffect(() => {
    onDraftChange({
      title,
      timeZone: city.timeZone,
      cityLabel: city.name,
      cityLocation: city.country,
      date,
      time,
      prefer,
      ...(draft.id ? { id: draft.id } : {}),
      ...(city.kind === 'city' ? { cityId: city.id } : {}),
      ...(advanceMinutes.length ? { advanceMinutes } : {}),
    });
  }, [title, city, date, time, prefer, advanceMinutes, draft.id, onDraftChange]);

  const toggleAdvance = (minutes: AdvanceMinutes) => {
    setAdvanceMinutes((selected) => selected.includes(minutes)
      ? selected.filter((value) => value !== minutes)
      : ADVANCE_OPTIONS.filter((value) => value === minutes || selected.includes(value)));
  };

  const submit = async () => {
    if (!resolution || targetMs === null) {
      setError('Enter a valid date and time.');
      return;
    }
    if (inPast) {
      setError('That moment has already passed. Pick a time in the future.');
      return;
    }
    setError(null);
    setSaving(true);
    const existingBase = existing
      ? (({ advanceMinutes: _advance, advanceFiredMinutes: _advanceFired, ...rest }) => rest)(existing)
      : undefined;
    const base = existing
      ? { ...existingBase!, title: title.trim(), targetMs, timeZone: city.timeZone, cityLabel: city.name, requestedDate: date, requestedTime: time, enabled: true, updatedAt: Date.now(), ...(advanceMinutes.length ? { advanceMinutes } : {}) }
      : createReminder({ title: title.trim(), targetMs, timeZone: city.timeZone, cityLabel: city.name, requestedDate: date, requestedTime: time, nowMs: Date.now(), ...(advanceMinutes.length ? { advanceMinutes } : {}) });
    const { firedAt: _fired, snoozedUntilMs: _snooze, ...reminder } = base;
    try {
      await onSave(reminder);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className={styles.form}
      aria-label={existing ? 'Edit reminder' : 'New reminder'}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className={styles.formHeader}>
        <span className={styles.formIcon}><BellIcon size={16} /></span>
        <div>
          <h2 className={styles.formTitle}>{existing ? 'Edit reminder' : 'New reminder'}</h2>
          <p className={styles.formSubtitle}>Choose the moment. Hourfolk handles the alerts.</p>
        </div>
      </div>
      <Field label="Title (optional)" htmlFor="reminder-title">
        <input
          id="reminder-title"
          className={inputStyles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Call with the Toronto team"
          maxLength={80}
          autoFocus
        />
      </Field>
      <Field label="City or time zone" htmlFor="reminder-city">
        <CityCombobox id="reminder-city" value={city} clearOnFocus onSelect={(entry) => setCity(entry)} />
      </Field>
      <div className={styles.formRow}>
        <Field label={`Date in ${city.name}`} htmlFor="reminder-date">
          <input
            id="reminder-date"
            type="date"
            className={inputStyles.input}
            value={date}
            min={addDays(todayInZone(city.timeZone, now), -1)}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            required
          />
        </Field>
        <Field label={`Time in ${city.name}`} htmlFor="reminder-time">
          <input id="reminder-time" type="time" className={inputStyles.input} value={time} onChange={(event) => event.target.value && setTime(event.target.value)} required />
        </Field>
      </div>

      <fieldset className={styles.alertsFieldset}>
        <legend className={styles.alertsLegend}>Alerts</legend>
        <div className={styles.atTimeRow}>
          <span className={styles.atTimeLabel}><BellIcon size={15} /> At scheduled time</span>
          <span className={styles.includedLabel}><CheckIcon size={13} /> Included</span>
        </div>
        <div className={styles.earlyRow}>
          <span className={styles.earlyLabel}>Earlier</span>
          <div className={styles.advancePicker} role="group" aria-label="Early alerts">
            {ADVANCE_OPTIONS.map((minutes) => {
              const selected = advanceMinutes.includes(minutes);
              return (
                <button
                  key={minutes}
                  type="button"
                  role="checkbox"
                  aria-label={`${minutes} min`}
                  aria-checked={selected}
                  className={[styles.advanceOption, selected ? styles.advanceSelected : ''].join(' ')}
                  onClick={() => toggleAdvance(minutes)}
                >
                  {selected ? <CheckIcon size={12} /> : null}
                  <span>{minutes}m</span>
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      {resolution?.kind === 'ambiguous' ? (
        <Notice tone="warning" title="This time happens twice">
          <p>{resolution.explanation}</p>
          <div className={styles.dstChoice}>
            <Segmented<Disambiguation>
              label="Which occurrence"
              value={resolution.chosen}
              options={[
                { value: 'earlier', label: `Earlier (${resolution.earlierOffset})` },
                { value: 'later', label: `Later (${resolution.laterOffset})` },
              ]}
              onChange={setPrefer}
              size="sm"
            />
          </div>
        </Notice>
      ) : null}
      {resolution?.kind === 'nonexistent' ? (
        <Notice tone="warning" title="This time doesn’t exist">
          <p>{resolution.explanation}</p>
        </Notice>
      ) : null}

      {cityDescription && localDescription ? (
        <div className={styles.confirm} aria-live="polite">
          <div className={styles.confirmSchedule}>
            <span className={styles.confirmIcon}><ClockIcon size={16} /></span>
            <div className={styles.confirmBody}>
              <p className={styles.confirmEyebrow}>Scheduled for</p>
              <p className={styles.confirmMain}>{cityDescription.weekdayShort}, {cityDescription.date} · {cityDescription.time}</p>
              <p className={styles.confirmLocation}>{city.name} ({cityDescription.utcOffset}) · {inPast ? 'already passed' : formatRelative(targetMs ?? now, now)}</p>
            </div>
          </div>
          {city.timeZone !== localZone ? (
            <p className={styles.confirmLocal}>
              <span>For you in {localName}</span>
              <strong>{localDescription.weekdayShort}, {localDescription.date} · {localDescription.time}</strong>
            </p>
          ) : null}
          <p className={styles.confirmAdvance}><BellIcon size={13} /> {advanceMinutesLabel(advanceMinutes)}</p>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving || inPast || !resolution}>
          {existing ? 'Save changes' : 'Save reminder'}
        </Button>
      </div>
    </form>
  );
}

interface ReminderGroupProps {
  title: string;
  reminders: Reminder[];
  now: number;
  localZone: string;
  hourCycle: '12h' | '24h';
  onEdit(reminder: Reminder): void;
  tone?: 'danger';
}

function ReminderGroup({ title, reminders, now, localZone, hourCycle, onEdit, tone }: ReminderGroupProps) {
  const { actions } = useStore();
  const { notify } = useToast();
  if (reminders.length === 0) return null;
  return (
    <section className={styles.group} aria-label={`${title} reminders`}>
      <h2 className={[styles.groupTitle, tone === 'danger' ? styles.groupDanger : ''].join(' ')}>{title}</h2>
      <ul className={styles.list}>
        {reminders.map((reminder) => {
          const target = effectiveTargetMs(reminder);
          const city = describeInstant(target, reminder.timeZone, { hourCycle, abbreviationFallback });
          const local = describeInstant(target, localZone, { hourCycle, abbreviationFallback });
          const sameZone = reminder.timeZone === localZone;
          return (
            <li key={reminder.id} className={styles.item}>
              <div className={styles.itemMain}>
                <p className={styles.itemTitle}>{reminder.title || 'Reminder'}</p>
                <p className={styles.itemLine}>
                  <strong>{city.time}</strong> in {reminder.cityLabel} · {city.weekdayShort}, {city.date}
                </p>
                {!sameZone ? (
                  <p className={styles.itemLine}>
                    {local.time} for you · {local.weekdayShort}, {local.date}
                  </p>
                ) : null}
                <p className={styles.itemMeta}>
                  {reminder.firedAt ? (
                    <Badge tone="success">Delivered</Badge>
                  ) : !reminder.enabled ? (
                    <Badge>Paused</Badge>
                  ) : target <= now ? (
                    <Badge tone="danger">Overdue</Badge>
                  ) : (
                    <Badge tone="accent">{formatRelative(target, now)}</Badge>
                  )}
                  {reminder.snoozedUntilMs && !reminder.firedAt ? <span>Snoozed</span> : null}
                  {reminder.advanceMinutes?.length && !reminder.firedAt ? <span>{advanceListLabel(reminder.advanceMinutes)} before</span> : null}
                </p>
              </div>
              <div className={styles.itemActions}>
                <IconButton label={`Edit ${reminder.title || 'reminder'}`} onClick={() => onEdit(reminder)}>
                  <PencilIcon />
                </IconButton>
                {!reminder.firedAt ? (
                  <IconButton
                    label={reminder.enabled ? `Pause ${reminder.title || 'reminder'}` : `Resume ${reminder.title || 'reminder'}`}
                    onClick={() => void actions.setReminderEnabled(reminder.id, !reminder.enabled)}
                  >
                    {reminder.enabled ? <PauseIcon /> : <PlayIcon />}
                  </IconButton>
                ) : null}
                <IconButton
                  label={`Delete ${reminder.title || 'reminder'}`}
                  onClick={() => {
                    void actions.deleteReminder(reminder.id);
                    notify('Reminder deleted');
                  }}
                >
                  <TrashIcon />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function advanceListLabel(minutes: AdvanceMinutes[]): string {
  const labels = minutes.map((value) => `${value} min`);
  if (labels.length === 1) return `Early alert ${labels[0]}`;
  return `Early alerts ${new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' }).format(labels)}`;
}

function advanceMinutesLabel(minutes: AdvanceMinutes[]): string {
  return minutes.length === 0
    ? 'At scheduled time'
    : `At time + ${new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' }).format(minutes.map((value) => `${value} min`))} early`;
}
