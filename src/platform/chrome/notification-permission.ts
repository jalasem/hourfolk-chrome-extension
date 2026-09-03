export type NotificationPermissionLevel = 'granted' | 'denied' | 'unknown';

/** Whether Chrome will show this extension's notifications (the user can turn them off per extension). */
export async function getNotificationPermissionLevel(): Promise<NotificationPermissionLevel> {
  if (typeof chrome === 'undefined' || !chrome.notifications?.getPermissionLevel) return 'unknown';
  try {
    const level = await chrome.notifications.getPermissionLevel();
    return level === 'denied' ? 'denied' : 'granted';
  } catch {
    return 'unknown';
  }
}
