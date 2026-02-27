/**
 * Date utility functions and patterns
 * Centralized to avoid duplication across the codebase
 */

// Module-level regex patterns to avoid re-creation on each function call
// Pattern for date time range: @2026-02-04 10:06:04~11:06:04
export const DATE_TIME_RANGE_PATTERN = /@\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}~\d{2}:\d{2}:\d{2}/;
// Pattern for single date time: @2026-02-04 10:06:04
export const SINGLE_DATE_TIME_PATTERN = /@\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/;
// Pattern for date only: @2026-02-04
export const DATE_ONLY_PATTERN = /@\d{4}-\d{2}-\d{2}/;

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get date string in ISO format (YYYY-MM-DD)
 */
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Format a date for markdown format: YYYY-MM-DD HH:mm:ss
 */
export const formatDateTimeForMarkdown = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date time for display
 * If it's a pure date format (YYYY-MM-DD) or marked as all-day, show only date
 */
export const formatDateTime = (dateStr: string, isAllDay?: boolean): string => {
  if (!dateStr) return '';

  // If it's a pure date format (YYYY-MM-DD) or marked as all-day, show only date
  if (isAllDay || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle ISO format with timezone: 2026-02-03T08:41:17+08:00
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  // Check if time is 00:00:00 (FullCalendar default for all-day events)
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  if (hours === 0 && minutes === 0 && seconds === 0) {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format time range from Item
 */
export const formatTimeRange = (startDateTime?: string, endDateTime?: string): string => {
  // If has both start and end time, display time range
  if (startDateTime && endDateTime) {
    const startTime = startDateTime.includes(' ')
      ? startDateTime.split(' ')[1].substring(0, 5)
      : '';
    const endTime = endDateTime.includes(' ')
      ? endDateTime.split(' ')[1].substring(0, 5)
      : '';
    if (startTime && endTime) {
      return `${startTime}~${endTime}`;
    }
    return startTime || endTime;
  }
  // Only start time
  if (startDateTime && startDateTime.includes(' ')) {
    return startDateTime.split(' ')[1].substring(0, 5);
  }
  return '';
};

/**
 * Format date label (今天/明天/date)
 */
export const formatDateLabel = (dateStr: string, todayLabel: string, tomorrowLabel: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return todayLabel;
  } else if (diffDays === 1) {
    return tomorrowLabel;
  } else {
    return dateStr;
  }
};

/**
 * Calculate duration between two date strings
 */
export const calculateDuration = (
  startStr: string,
  endStr: string,
  lunchBreakStart?: string,
  lunchBreakEnd?: string
): string => {
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return '';
  }

  let diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return '';
  }

  // Subtract lunch break if the time range overlaps with it
  if (lunchBreakStart && lunchBreakEnd) {
    const lunchStartParts = lunchBreakStart.split(':').map(Number);
    const lunchEndParts = lunchBreakEnd.split(':').map(Number);

    if (lunchStartParts.length === 2 && lunchEndParts.length === 2) {
      const lunchStartMinutes = lunchStartParts[0] * 60 + lunchStartParts[1];
      const lunchEndMinutes = lunchEndParts[0] * 60 + lunchEndParts[1];

      // Get start and end time in minutes from midnight
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      // Check if the time range overlaps with lunch break
      // Overlap condition: start < lunchEnd AND end > lunchStart
      if (startMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes) {
        // Calculate actual overlap duration
        const overlapStart = Math.max(startMinutes, lunchStartMinutes);
        const overlapEnd = Math.min(endMinutes, lunchEndMinutes);
        const overlapMinutes = overlapEnd - overlapStart;

        if (overlapMinutes > 0) {
          diffMs -= overlapMinutes * 60 * 1000;
        }
      }
    }
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHours}:${diffMinutes.toString().padStart(2, '0')}`;
};
