import { useEffect, useId, useMemo, useState } from 'react';
import { useStore } from '@/app/providers/StoreProvider';
import { useAppState, type PlanSource } from '@/app/providers/AppStateProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useNow } from '@/app/hooks/useNow';
import { useCityProviderReady } from '@/app/hooks/useCityProvider';
import { abbreviationFallback, describeLocalLocation } from '@/app/lib/local';
import { formatRelativeDuration } from '@/app/lib/relative';
import { buildPlanRows, formatPlanForCopy } from '@/app/lib/plan';
import { findCityStrict } from '@/app/lib/find-city';
import { parsePlanQuery } from '@/domain/parse';
import type { CityEntry } from '@/domain/cities/types';
import { formatRegionCountry } from '@/domain/cities/types';
import { getDeviceTimeZone, isoTimeAt, todayInZone } from '@/domain/time/zone-clock';
import { describeInstant, formatIsoDateLong } from '@/domain/time/format';
import { resolveWallClock } from '@/domain/time/resolve';
import { nextOccurrence } from '@/domain/time/occurrence';
import type { Disambiguation, HourCycle } from '@/domain/time/types';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { Field } from '@/app/components/Field';
import { Notice } from '@/app/components/Notice';
import { Segmented } from '@/app/components/Segmented';
import { CityCombobox } from '@/app/components/CityCombobox';
import { ArrowLeftIcon, BellIcon, ClockIcon, CopyIcon, SparkIcon } from '@/app/components/Icons';
import inputStyles from '@/app/components/inputs.module.css';
import styles from './PlanView.module.css';

const HOUR_CYCLE_OPTIONS = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
] as const;

function entryForSource(source: PlanSource): CityEntry {
  return {
    id: source.cityId ?? `zone:${source.timeZone}`,
    kind: source.cityId ? 'city' : 'zone',
    name: source.cityLabel,
    country: source.cityLocation,
    countryCode: '',
    timeZone: source.timeZone,
  };
}

export function PlanView() {
  const { state, actions } = useStore();
  const { planSource, setPlanSource, planQuery: query, setPlanQuery: setQuery, openReminderDraft } = useAppState();
  const { notify } = useToast();
  const ready = useCityProviderReady();
  const now = useNow(planSource ? 'minute' : 'second');
  const localZone = useMemo(getDeviceTimeZone, []);
  const local = useMemo(() => describeLocalLocation(localZone), [localZone]);
  const { hourCycle } = state.settings;
  const [feedback, setFeedback] = useState<{ tone: 'info' | 'warning'; lines: string[] } | null>(null);
  const inputId = useId();

  const localEntry = useMemo<CityEntry>(
    () => ({ id: `zone:${localZone}`, kind: 'zone', name: local.name, country: local.detail, countryCode: '', timeZone: localZone }),
    [localZone, local],
  );

  const source: PlanSource = planSource ?? {
    timeZone: localZone,
    cityLabel: local.name,
    cityLocation: local.detail,
    time: isoTimeAt(now, localZone),
    date: todayInZone(localZone, now),
    prefer: 'earlier',
  };

  const inferred = source.date === undefined ? nextOccurrence(source.timeZone, source.time, now) : null;
  const effectiveDate = source.date ?? inferred?.date ?? todayInZone(source.timeZone, now);
  const resolution = useMemo(
    () => resolveWallClock({ timeZone: source.timeZone, date: effectiveDate, time: source.time, prefer: source.prefer }),
    [source.timeZone, effectiveDate, source.time, source.prefer],
  );
  const epochMs = planSource ? resolution.epochMs : now;

  const rows = useMemo(
    () =>
      buildPlanRows({
        epochMs,
        nowMs: now,
        local,
        source: { timeZone: source.timeZone, cityLabel: source.cityLabel, cityLocation: source.cityLocation },
        cities: state.cities,
        hourCycle,
      }),
    [epochMs, now, local, source.timeZone, source.cityLabel, source.cityLocation, state.cities, hourCycle],
  );
  const sourceDescription = describeInstant(epochMs, source.timeZone, { hourCycle, abbreviationFallback });

  useEffect(() => {
    if (!planSource) setFeedback(null);
  }, [planSource]);

  const update = (patch: Partial<PlanSource>) => {
    const base: PlanSource = planSource ?? { ...source, date: undefined };
    setPlanSource({ ...base, ...patch });
  };

  const submitQuery = () => {
    const text = query.trim();
    if (!text) return;
    const result = parsePlanQuery(text, { nowMs: now, localZone, findCity: findCityStrict });
    if (!result.time) {
      setFeedback({
        tone: 'warning',
        lines: ['Add a time such as “2pm” or “14:00” — for example “2pm in New York”.', ...(result.leftovers.length ? [`Not understood: ${result.leftovers.join(' ')}`] : [])],
      });
      return;
    }
    const entry = result.city?.entry;
    const next: PlanSource = {
      timeZone: entry?.timeZone ?? localZone,
      cityLabel: entry?.name ?? local.name,
      cityLocation: entry ? formatRegionCountry(entry) || entry.timeZone : local.detail,
      time: result.time.iso,
      prefer: 'earlier',
      ...(entry?.id ? { cityId: entry.id } : {}),
      ...(result.date ? { date: result.date.iso } : {}),
    };
    setPlanSource(next);
    const lines = [...result.explanation];
    if (result.leftovers.length) lines.push(`Ignored: ${result.leftovers.join(' ')}`);
    setFeedback({ tone: result.leftovers.length ? 'warning' : 'info', lines });
  };

  const copyAll = async () => {
    const text = formatPlanForCopy(rows, source, epochMs, hourCycle);
    try {
      await navigator.clipboard.writeText(text);
      notify(`Copied ${rows.length} times`);
    } catch {
      notify('Copy failed — clipboard is unavailable here');
    }
  };

  const setReminder = () => {
    openReminderDraft({
      title: '',
      timeZone: source.timeZone,
      cityLabel: source.cityLabel,
      cityLocation: source.cityLocation,
      ...(source.cityId ? { cityId: source.cityId } : {}),
      date: effectiveDate,
      time: source.time,
      prefer: source.prefer,
    });
  };

  return (
    <section id="view-plan" role="tabpanel" aria-labelledby="tab-plan" className={styles.view}>
      <form
        className={styles.command}
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery();
        }}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          Describe a time to plan
        </label>
        <div className={styles.commandRow}>
          <SparkIcon className={styles.commandIcon} />
          <input
            id={inputId}
            className={[inputStyles.input, styles.commandInput].join(' ')}
            placeholder="Try ‘2pm in New York’"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={!ready}
          />
          <Button type="submit" variant="primary" disabled={!ready || !query.trim()}>
            Plan
          </Button>
        </div>
        {!ready ? <p className={styles.hint}>Loading city names…</p> : null}
        {feedback ? (
          <Notice tone={feedback.tone === 'warning' ? 'warning' : 'info'} className={styles.feedback}>
            {feedback.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Notice>
        ) : (
          <p className={styles.hint}>Also understood: “14:00 London”, “tomorrow at 9am Tokyo”, “Sep 8 at 4:30pm in Toronto”.</p>
        )}
      </form>

      <div className={styles.controls}>
        <Field label="From" htmlFor="plan-city" className={styles.cityField}>
          <CityCombobox
            id="plan-city"
            value={planSource ? entryForSource(source) : localEntry}
            clearOnFocus
            onSelect={(entry) =>
              update({
                timeZone: entry.timeZone,
                cityLabel: entry.name,
                cityLocation: formatRegionCountry(entry) || entry.timeZone,
                cityId: entry.id,
              })
            }
          />
        </Field>
        <Field label="Time" htmlFor="plan-time">
          <input
            id="plan-time"
            type="time"
            className={inputStyles.input}
            value={source.time}
            onChange={(event) => {
              if (event.target.value) update({ time: event.target.value });
            }}
            required
          />
        </Field>
        <Field
          label="Date"
          htmlFor="plan-date"
          hint={
            inferred ? (
              <span>
                <Badge tone="accent">Next occurrence</Badge>{' '}
                {inferred.isToday ? `Still ahead today in ${source.cityLabel}.` : `Already passed today in ${source.cityLabel}, so tomorrow.`}
              </span>
            ) : planSource ? (
              <button type="button" className={styles.linkButton} onClick={() => update({ date: undefined })}>
                Use next occurrence
              </button>
            ) : undefined
          }
        >
          <input
            id="plan-date"
            type="date"
            className={inputStyles.input}
            value={effectiveDate}
            onChange={(event) => {
              if (event.target.value) update({ date: event.target.value });
            }}
            required
          />
        </Field>
        <Field label="Format">
          <Segmented<HourCycle>
            label="Hour format"
            value={hourCycle}
            options={HOUR_CYCLE_OPTIONS}
            onChange={(value) => void actions.updateSettings({ hourCycle: value })}
          />
        </Field>
        {planSource ? (
          <div className={[styles.relativeTiming, epochMs < now ? styles.relativePast : ''].join(' ')} aria-live="polite">
            <span className={styles.relativeIcon}><ClockIcon size={16} /></span>
            <span className={styles.relativeLabel}>Time from now</span>
            <strong>{formatRelativeDuration(epochMs, now)}</strong>
          </div>
        ) : null}
      </div>

      {planSource && resolution.kind === 'ambiguous' ? (
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
              onChange={(value) => update({ prefer: value })}
              size="sm"
            />
          </div>
        </Notice>
      ) : null}
      {planSource && resolution.kind === 'nonexistent' ? (
        <Notice tone="warning" title="This time doesn’t exist">
          <p>{resolution.explanation}</p>
        </Notice>
      ) : null}

      <section className={styles.results} aria-label="Converted times">
        <header className={styles.resultsHeader}>
          <p className={styles.resultsTime}>
            {sourceDescription.time} <span className={styles.resultsIn}>in {source.cityLabel}</span>
          </p>
          <p className={styles.resultsDate}>
            {formatIsoDateLong(sourceDescription.isoDate)} · {sourceDescription.abbreviation.startsWith('GMT') ? '' : `${sourceDescription.abbreviation} · `}
            {sourceDescription.utcOffset}
            {!planSource ? ' · Now' : ''}
          </p>
        </header>
        <ul className={styles.rows}>
          {rows.map((row) => (
            <li key={row.key} className={[styles.row, row.role === 'local' ? styles.rowLocal : ''].join(' ')}>
              <div className={styles.rowMain}>
                <p className={styles.rowName}>
                  {row.name}
                  {row.role === 'source' ? <Badge tone="accent">Source</Badge> : null}
                  {row.role === 'local' ? <Badge>You</Badge> : null}
                </p>
                <p className={styles.rowLocation}>{row.role === 'local' ? row.location.replace(' · You', '') : row.location}</p>
              </div>
              <div className={styles.rowTime}>
                <p className={styles.rowClock}>{row.description.time}</p>
                <p className={styles.rowMeta}>
                  <span>
                    {row.description.weekdayShort}, {row.description.date}
                  </span>
                  <Badge tone={row.relation.dayDelta === 0 ? 'neutral' : 'accent'}>{row.relation.label}</Badge>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.actions}>
        {planSource ? (
          <Button icon={<ArrowLeftIcon />} onClick={() => setPlanSource(null)}>
            Back to now
          </Button>
        ) : null}
        <Button icon={<CopyIcon />} onClick={() => void copyAll()}>
          Copy all times
        </Button>
        <Button variant="primary" icon={<BellIcon />} onClick={setReminder}>
          Set reminder
        </Button>
      </div>
    </section>
  );
}
