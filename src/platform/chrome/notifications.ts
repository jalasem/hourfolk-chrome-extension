export interface NotificationButton {
  title: string;
}

export interface NotificationContent {
  title: string;
  message: string;
  contextMessage: string;
  buttons?: NotificationButton[];
  /** Chrome's native notification sound/vibration is allowed unless explicitly muted. */
  silent?: boolean;
}

/** Shows a basic Chrome notification. Never throws — failures are logged and swallowed. */
export async function showNotification(id: string, content: NotificationContent): Promise<void> {
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: content.title,
      message: content.message,
      contextMessage: content.contextMessage,
      priority: 2,
      silent: content.silent ?? false,
      ...(content.buttons ? { buttons: content.buttons } : {}),
    });
  } catch (err) {
    console.error('[hourfolk] showNotification failed', err);
  }
}

export async function clearNotification(id: string): Promise<void> {
  try {
    await chrome.notifications.clear(id);
  } catch (err) {
    console.error('[hourfolk] clearNotification failed', err);
  }
}
