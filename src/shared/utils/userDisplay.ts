export function getUserDisplayName(firstName?: string | null, lastName?: string | null, fallback = 'Пользователь'): string {
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return fullName || fallback;
}

export function getUserInitials(name?: string | null, fallback = '??'): string {
  const normalized = String(name ?? '').trim();
  if (!normalized) return fallback;

  const parts = normalized.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || normalized.slice(0, 2).toUpperCase() || fallback;
}
