import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with clsx and tailwind-merge
 * Combines class names and resolves conflicts intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string to a localized date format (Russian locale)
 * @param dateString - ISO date string or date string
 * @returns Formatted date string in Russian locale
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formats a date string to a short date format (DD.MM.YYYY)
 * @param dateString - ISO date string or date string
 * @returns Formatted date string in DD.MM.YYYY format
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Formats a date string to include time (DD.MM.YYYY HH:MM)
 * @param dateString - ISO date string or date string
 * @returns Formatted date string with time
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Checks if a date string is valid
 * @param dateString - Date string to validate
 * @returns True if date is valid, false otherwise
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Gets relative time string (e.g., "2 hours ago", "in 3 days")
 * @param dateString - ISO date string or date string
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (Math.abs(diffInSeconds) < 60) {
    return 'только что'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (Math.abs(diffInMinutes) < 60) {
    return diffInMinutes > 0 
      ? `${diffInMinutes} ${diffInMinutes === 1 ? 'минуту' : diffInMinutes < 5 ? 'минуты' : 'минут'} назад`
      : `через ${Math.abs(diffInMinutes)} ${Math.abs(diffInMinutes) === 1 ? 'минуту' : Math.abs(diffInMinutes) < 5 ? 'минуты' : 'минут'}`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (Math.abs(diffInHours) < 24) {
    return diffInHours > 0
      ? `${diffInHours} ${diffInHours === 1 ? 'час' : diffInHours < 5 ? 'часа' : 'часов'} назад`
      : `через ${Math.abs(diffInHours)} ${Math.abs(diffInHours) === 1 ? 'час' : Math.abs(diffInHours) < 5 ? 'часа' : 'часов'}`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (Math.abs(diffInDays) < 30) {
    return diffInDays > 0
      ? `${diffInDays} ${diffInDays === 1 ? 'день' : diffInDays < 5 ? 'дня' : 'дней'} назад`
      : `через ${Math.abs(diffInDays)} ${Math.abs(diffInDays) === 1 ? 'день' : Math.abs(diffInDays) < 5 ? 'дня' : 'дней'}`
  }
  
  return formatDate(dateString)
}
