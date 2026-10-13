/**
 * Formatting and helper utilities
 */

export function formatQatarPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('974') && cleaned.length === 11) {
    return `+974 ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 8) {
    return `+974 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return phone;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-QA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatTime(timeStr: string): string {
  // Accepts HH:mm and formats to 12-hour AM/PM
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}
