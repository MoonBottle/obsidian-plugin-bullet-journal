import { Project, Task, Item, CalendarEvent, GanttTask } from '../models/types';

export class DataConverter {
  /**
   * Get project display name with directory path for disambiguation
   * Format: "ProjectName (directory/path)"
   */
  private static getProjectDisplayName(project: Project): string {
    if (project.directoryPath) {
      return `${project.name} (${project.directoryPath})`;
    }
    return project.name;
  }
  /**
   * Convert items to calendar events
   * If item has time part (HH:mm:ss), it's not an all-day event
   */
  public static itemsToCalendarEvents(items: Item[]): CalendarEvent[] {
    return items.map((item, index) => {
      const hasTime = !!item.startDateTime && item.startDateTime.includes(' ');
      const start = item.startDateTime
        ? item.startDateTime.replace(' ', 'T')
        : item.date;
      const end = item.endDateTime
        ? item.endDateTime.replace(' ', 'T')
        : item.startDateTime?.replace(' ', 'T') || item.date;

      return {
        id: `event-${item.project?.name || 'unknown'}-${item.date}-${index}`,
        title: item.content.substring(0, 50) + (item.content.length > 50 ? '...' : ''),
        start,
        end,
        allDay: !hasTime,
        item: item.content,
        hasItems: true,
        project: item.project ? this.getProjectDisplayName(item.project) : undefined,
        projectLinks: item.project?.links,
        task: item.task?.name,
        taskLinks: item.task?.links,
        level: item.task?.level,
        filePath: item.project?.filePath,
        lineNumber: item.lineNumber,
        projectGroupId: item.project?.groupId
      };
    });
  }

  /**
   * Convert tasks with dates to calendar events
   * Tasks without dates are skipped
   */
  public static tasksToCalendarEvents(tasks: Task[], project: Project): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    tasks.forEach((task, index) => {
      // Only process tasks with dates and no items (items are handled separately)
      if (task.date && task.items.length === 0) {
        const hasTime = !!task.startDateTime && task.startDateTime.includes(' ');
        const start = task.startDateTime
          ? task.startDateTime.replace(' ', 'T')
          : task.date;
        const end = task.endDateTime
          ? task.endDateTime.replace(' ', 'T')
          : task.startDateTime?.replace(' ', 'T') || task.date;

        events.push({
          id: `task-event-${project.name}-${task.date || 'nodate'}-${index}`,
          title: task.name,
          start,
          end,
          allDay: !hasTime,
          item: task.name,
          hasItems: false,
          project: this.getProjectDisplayName(project),
          projectLinks: project.links,
          task: task.name,
          taskLinks: task.links,
          level: task.level,
          filePath: project.filePath,
          lineNumber: task.lineNumber,
          projectGroupId: project.groupId
        });
      }
    });

    return events;
  }

  /**
   * Convert all projects to calendar events (items + tasks with dates)
   */
  public static projectsToCalendarEvents(projects: Project[]): CalendarEvent[] {
    const allEvents: CalendarEvent[] = [];

    projects.forEach(project => {
      // Add events from items
      const items: Item[] = [];
      project.tasks.forEach(task => {
        task.items.forEach(item => {
          item.task = task;
          item.project = project;
          items.push(item);
        });
      });
      allEvents.push(...this.itemsToCalendarEvents(items));

      // Add events from tasks with dates but no items
      allEvents.push(...this.tasksToCalendarEvents(project.tasks, project));
    });

    return allEvents;
  }

  /**
   * Convert tasks to gantt tasks
   */
  public static tasksToGanttTasks(tasks: Task[], project: Project): GanttTask[] {
    const ganttTasks: GanttTask[] = [];
    const projectDisplayName = this.getProjectDisplayName(project);

    tasks.forEach((task, index) => {
      // Use task date if available, otherwise use earliest item date
      let startDate = task.date;
      let endDate = task.date;

      if (!startDate && task.items.length > 0) {
        const itemDates = task.items.map(item => item.date).sort();
        startDate = itemDates[0];
        endDate = itemDates[itemDates.length - 1];
      }

      if (startDate) {
        ganttTasks.push({
          id: `task-${project.name}-${index}`,
          title: task.name,
          start: startDate,
          end: endDate || startDate,
          project: projectDisplayName,
          level: task.level,
          progress: task.items.length > 0 ? 100 : 0
        });
      }
    });

    return ganttTasks;
  }

  /**
   * Convert projects to gantt tasks
   */
  public static projectsToGanttTasks(projects: Project[]): GanttTask[] {
    const ganttTasks: GanttTask[] = [];

    projects.forEach(project => {
      const projectTasks = this.tasksToGanttTasks(project.tasks, project);
      ganttTasks.push(...projectTasks);
    });

    return ganttTasks;
  }

  /**
   * Group items by date
   */
  public static groupItemsByDate(items: Item[]): Record<string, Item[]> {
    const grouped: Record<string, Item[]> = {};

    items.forEach(item => {
      if (!grouped[item.date]) {
        grouped[item.date] = [];
      }
      grouped[item.date].push(item);
    });

    return grouped;
  }

  /**
   * Group tasks by level
   */
  public static groupTasksByLevel(tasks: Task[]): Record<string, Task[]> {
    const grouped: Record<string, Task[]> = {
      L1: [],
      L2: [],
      L3: []
    };

    tasks.forEach(task => {
      grouped[task.level].push(task);
    });

    return grouped;
  }
}
