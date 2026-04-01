const API_URL = import.meta.env.VITE_API_URL || '';

function prefixWithApi(url: string): string {
  return API_URL ? `${API_URL}${url}` : url;
}

export function resolveProfileMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/profile-media/')) {
    return prefixWithApi(url);
  }
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return url;
}

export function resolveAchievementMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/achievement-media/')) {
    return prefixWithApi(url);
  }
  if (url.startsWith('/icons/achievements/')) {
    const filename = url.replace('/icons/achievements/', '');
    return prefixWithApi(`/achievement-media/${filename}`);
  }
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return prefixWithApi(`/achievement-media/${url}`);
}
