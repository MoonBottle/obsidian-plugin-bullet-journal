export type ItemStatus = 'pending' | 'completed' | 'abandoned';

export interface Project {
  id?: string;
  name: string;
  description: string;
  tasks: Task[];
  filePath?: string;
  directoryPath?: string;
  groupId?: string;
  links?: Array<{ name: string; url: string }>;
}

export interface Task {
  id?: string;
  name: string;
  level: 'L1' | 'L2' | 'L3';
  date?: string;
  startDateTime?: string;
  endDateTime?: string;
  items: Item[];
  lineNumber?: number;
  links?: Array<{ name: string; url: string }>;
  blockId?: string;
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
  docId?: string;
  blockId?: string;
  status?: ItemStatus;
  links?: Array<{ name: string; url: string }>;
}

export interface ProjectDirectory {
  path: string;
  enabled: boolean;
  groupId?: string;
}
