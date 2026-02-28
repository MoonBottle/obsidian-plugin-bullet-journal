import { Task, Item } from '../models/types';

export class LineParser {
  /**
   * Parse a task line
   * Supports formats:
   * - 任务名 #任务 [@层级]
   * Note: Task time is determined by its items, not by the task line itself
   */
  public static parseTaskLine(line: string, lineNumber: number): Task {
    let level: 'L1' | 'L2' | 'L3' = 'L1';

    // Step 1: Extract task name (content before #任务)
    const taskTagIndex = line.indexOf('#任务');
    let name = taskTagIndex >= 0 ? line.substring(0, taskTagIndex).trim() : line.trim();

    // Step 2: Extract level if present
    const levelMatch = line.match(/@(L[1-3])/);
    if (levelMatch) {
      level = levelMatch[1] as 'L1' | 'L2' | 'L3';
    }

    // Step 3: Clean up task name
    // Remove markdown syntax if any
    name = name.replace(/\[|\]/g, '').trim();

    return {
      name,
      level,
      date: '',
      items: [],
      lineNumber
    };
  }

  /**
   * Parse an item line
   * Supports formats:
   * - @YYYY-MM-DD (single date, all-day event)
   * - @YYYY-MM-DD HH:mm:ss (single datetime)
   * - @YYYY-MM-DD HH:mm:ss~HH:mm:ss (time range format)
   */
  public static parseItemLine(line: string, lineNumber: number): Item | null {
    // Match time range format: @YYYY-MM-DD HH:mm:ss~HH:mm:ss
    const timeRangeRegex = /@(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})~(\d{2}:\d{2}:\d{2})/;
    const timeRangeMatch = line.match(timeRangeRegex);

    let startDateTime: string | undefined;
    let endDateTime: string | undefined;
    let date: string | undefined;

    if (timeRangeMatch) {
      // Time range format: @date startTime~endTime
      date = timeRangeMatch[1];
      startDateTime = `${date} ${timeRangeMatch[2]}`;
      endDateTime = `${date} ${timeRangeMatch[3]}`;
    } else {
      // Match single datetime format: @YYYY-MM-DD HH:mm:ss or @YYYY-MM-DD
      const dateTimeRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/;
      const dateTimeMatch = line.match(dateTimeRegex);

      if (!dateTimeMatch) {
        return null;
      }

      const match = dateTimeMatch[1];
      date = match.split(' ')[0];
      // If it has time part, treat it as both start and end
      if (match.includes(' ')) {
        startDateTime = match;
        endDateTime = match;
      }
    }

    // Remove all datetime patterns from content
    const content = line.replace(timeRangeRegex, '').replace(/@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/, '').trim();

    return {
      content,
      date,
      startDateTime,
      endDateTime,
      lineNumber
    };
  }

  /**
   * Check if a line is an item line (contains date pattern)
   */
  public static isItemLine(line: string): boolean {
    const timeRangeRegex = /@(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})~(\d{2}:\d{2}:\d{2})/;
    const dateTimeRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/;
    return timeRangeRegex.test(line) || dateTimeRegex.test(line);
  }
}
