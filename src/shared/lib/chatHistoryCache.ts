const STORAGE_PREFIX = 'lms_chat_history_cache_v1';
const MAX_MESSAGES_PER_CHAT = 30;

function getStorageKey(scope: 'dm' | 'group', chatId: string | number): string {
  return `${STORAGE_PREFIX}:${scope}:${String(chatId)}`;
}

export function loadChatHistoryCache<T>(scope: 'dm' | 'group', chatId: string | number): T[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(getStorageKey(scope, chatId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function saveChatHistoryCache<T>(scope: 'dm' | 'group', chatId: string | number, messages: T[]): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      getStorageKey(scope, chatId),
      JSON.stringify(messages.slice(-MAX_MESSAGES_PER_CHAT)),
    );
  } catch {
    // ignore storage quota issues
  }
}
