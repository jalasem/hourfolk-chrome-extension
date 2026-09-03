import type { Surface } from '@/app/surface';
import { useStore } from '@/app/providers/StoreProvider';
import { isExtensionContext } from '@/platform';
import { openDashboardTab, openSidePanel } from '@/platform/chrome/surface';
import type { HourCycle } from '@/domain/time/types';
import type { SurfacePreference, ThemePreference } from '@/domain/storage/schema';
import { Dialog } from '@/app/components/Dialog';
import { Segmented } from '@/app/components/Segmented';
import { Button } from '@/app/components/Button';
import { ExpandIcon, SidePanelIcon } from '@/app/components/Icons';
import styles from './SettingsDialog.module.css';

const SURFACES: { value: SurfacePreference; label: string; description: string }[] = [
  { value: 'popup', label: 'Popup', description: 'The toolbar button opens a compact popup.' },
  { value: 'sidepanel', label: 'Side panel', description: 'The toolbar button opens Hourfolk beside your tabs.' },
  { value: 'page', label: 'Full page', description: 'The toolbar button opens the Hourfolk dashboard in a tab.' },
];

export function SettingsDialog({ open, onClose, surface }: { open: boolean; onClose(): void; surface: Surface }) {
  const { state, actions } = useStore();
  const { settings } = state;
  const inExtension = isExtensionContext();

  const openPanel = async () => {
    const win = await chrome.windows.getCurrent();
    if (win.id !== undefined) await openSidePanel(win.id);
    if (surface === 'popup') window.close();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className={styles.stack}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowLabel}>Time format</p>
          </div>
          <Segmented<HourCycle>
            label="Time format"
            value={settings.hourCycle}
            options={[
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' },
            ]}
            onChange={(value) => void actions.updateSettings({ hourCycle: value })}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <label className={styles.rowLabel} htmlFor="setting-notification-sound">
              Play sound for alerts
            </label>
            <p className={styles.rowDescription}>Uses Chrome and your system’s notification sound.</p>
          </div>
          <input
            id="setting-notification-sound"
            type="checkbox"
            className={styles.switch}
            role="switch"
            aria-checked={!settings.notificationsMuted}
            checked={!settings.notificationsMuted}
            onChange={(event) => void actions.updateSettings({ notificationsMuted: !event.target.checked })}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <label className={styles.rowLabel} htmlFor="setting-seconds">
              Show seconds on the local clock
            </label>
          </div>
          <input
            id="setting-seconds"
            type="checkbox"
            className={styles.switch}
            role="switch"
            aria-checked={settings.showSeconds}
            checked={settings.showSeconds}
            onChange={(event) => void actions.updateSettings({ showSeconds: event.target.checked })}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowLabel}>Theme</p>
          </div>
          <Segmented<ThemePreference>
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(value) => void actions.updateSettings({ theme: value })}
          />
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Open Hourfolk as</legend>
          <div className={styles.radios}>
            {SURFACES.map((option) => (
              <label key={option.value} className={styles.radio}>
                <input
                  type="radio"
                  name="surface"
                  value={option.value}
                  checked={settings.surface === option.value}
                  onChange={() => void actions.updateSettings({ surface: option.value })}
                />
                <span className={styles.radioText}>
                  <span className={styles.radioLabel}>{option.label}</span>
                  <span className={styles.radioDescription}>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
          <p className={styles.note}>The full page is a regular tab with the Hourfolk dashboard. It does not replace Chrome’s New Tab page.</p>
        </fieldset>

        {inExtension ? (
          <div className={styles.links}>
            {surface !== 'sidepanel' ? (
              <Button size="sm" icon={<SidePanelIcon />} onClick={() => void openPanel()}>
                Open side panel now
              </Button>
            ) : null}
            {surface !== 'page' ? (
              <Button
                size="sm"
                icon={<ExpandIcon />}
                onClick={() => {
                  void openDashboardTab();
                  if (surface === 'popup') window.close();
                }}
              >
                Open full page now
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className={styles.about}>Hourfolk 0.1.0 · Your hours, wherever work happens.</p>
      </div>
    </Dialog>
  );
}
