/** Сокращение описания курса для карточек каталога (как на главной). */
export function getShortDescription(
  text?: string | null,
  maxLength = 90,
): string {
  if (!text) return "Описание отсутствует";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
