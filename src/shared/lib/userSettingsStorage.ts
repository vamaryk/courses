const STORAGE_KEY = 'lms_user_settings_v2';

export type NotificationSettings = {
  email: boolean;
  push: boolean;
  sms: boolean;
};

export type StoredUserSettings = {
  notifications: NotificationSettings;
};

const defaults: StoredUserSettings = {
  notifications: { email: true, push: false, sms: false },
};

function mergeWithDefaults(parsed: unknown): StoredUserSettings {
  if (!parsed || typeof parsed !== 'object') {
    return { notifications: { ...defaults.notifications } };
  }
  const o = parsed as Record<string, unknown>;
  const legacy = o.privacy && typeof o.privacy === 'object';
  const n =
    o.notifications && typeof o.notifications === 'object'
      ? (o.notifications as Record<string, boolean>)
      : legacy && o.privacy && typeof (o.privacy as { allowAnalytics?: boolean }).allowAnalytics === 'boolean'
        ? {}
        : {};
  return {
    notifications: {
      email: typeof n.email === 'boolean' ? n.email : defaults.notifications.email,
      push: typeof n.push === 'boolean' ? n.push : defaults.notifications.push,
      sms: typeof n.sms === 'boolean' ? n.sms : defaults.notifications.sms,
    },
  };
}

export function loadStoredUserSettings(): StoredUserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem('lms_user_settings_v1');
      if (legacyRaw) {
        const merged = mergeWithDefaults(JSON.parse(legacyRaw));
        persistUserSettings(merged);
        return merged;
      }
      return { notifications: { ...defaults.notifications } };
    }
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return { notifications: { ...defaults.notifications } };
  }
}

export function persistUserSettings(settings: StoredUserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
