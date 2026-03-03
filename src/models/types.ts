export type ItemStatus = 'pending' | 'completed' | 'abandoned';

export interface Project {
  name: string;
  description: string;
  tasks: Task[];
  filePath?: string;
  directoryPath?: string;
  groupId?: string;
  links?: Array<{ name: string; url: string }>;
  getCompletedItems(): Item[];
  getAbandonedItems(): Item[];
}

export interface Task {
  name: string;
  level: 'L1' | 'L2' | 'L3';
  date?: string;
  startDateTime?: string;
  endDateTime?: string;
  items: Item[];
  lineNumber?: number;
  links?: Array<{ name: string; url: string }>;
}

export interface Item {
  id: string;
  content: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  task?: Task;
  project?: Project;
  lineNumber?: number;
  status?: ItemStatus;
  links?: Array<{ name: string; url: string }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  item?: string;
  hasItems?: boolean;
  project?: string;
  projectLinks?: Array<{ name: string; url: string }>;
  task?: string;
  taskLinks?: Array<{ name: string; url: string }>;
  itemLinks?: Array<{ name: string; url: string }>;
  level?: string;
  filePath?: string;
  lineNumber?: number;
  projectGroupId?: string;
}

export interface GanttTask {
  id: string;
  title: string;
  start: string;
  end: string;
  project: string;
  level: 'L1' | 'L2' | 'L3';
  progress?: number;
}
