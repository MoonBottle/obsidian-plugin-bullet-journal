import { ObsidianClient, type PluginSettings } from './obsidian-client';
import type { Project, Task, Item, ProjectDirectory } from './types';

function generateItemId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function detectItemStatus(line: string): 'pending' | 'completed' | 'abandoned' {
  if (line.includes('#done') || line.includes('#已完成')) {
    return 'completed';
  }
  if (line.includes('#abandoned') || line.includes('#已放弃')) {
    return 'abandoned';
  }
  return 'pending';
}

class SimpleLineParser {
  static readonly TASK_TAG = '#任务';

  static parseTaskLine(line: string, lineNumber: number): Task {
    let level: 'L1' | 'L2' | 'L3' = 'L1';

    const taskTagIndex = line.indexOf('#任务');
    let name = taskTagIndex >= 0 ? line.substring(0, taskTagIndex).trim() : line.trim();

    const levelMatch = line.match(/@(L[1-3])/);
    if (levelMatch) {
      level = levelMatch[1] as 'L1' | 'L2' | 'L3';
    }

    name = name.replace(/\[|\]/g, '').trim();

    return {
      name,
      level,
      date: '',
      items: [],
      lineNumber
    };
  }

  static parseItemLine(line: string, lineNumber: number): Item | null {
    const timeRangeRegex = /@(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})~(\d{2}:\d{2}:\d{2})/;
    const timeRangeMatch = line.match(timeRangeRegex);

    let startDateTime: string | undefined;
    let endDateTime: string | undefined;
    let date: string | undefined;

    if (timeRangeMatch) {
      date = timeRangeMatch[1];
      startDateTime = `${date} ${timeRangeMatch[2]}`;
      endDateTime = `${date} ${timeRangeMatch[3]}`;
    } else {
      const dateTimeRegex = /@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/;
      const dateTimeMatch = line.match(dateTimeRegex);

      if (!dateTimeMatch) {
        return null;
      }

      const match = dateTimeMatch[1];
      date = match.split(' ')[0];
      if (match.includes(' ')) {
        startDateTime = match;
        endDateTime = match;
      }
    }

    let content = line.replace(timeRangeRegex, '').replace(/@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/, '').trim();
    content = content.replace(/#done|#已完成|#abandoned|#已放弃/g, '').trim();

    return {
      content,
      date,
      startDateTime,
      endDateTime,
      lineNumber
    } as Item;
  }

  static isTaskLine(line: string): boolean {
    return line.includes(this.TASK_TAG);
  }

  static isLinkLine(line: string): boolean {
    return line.startsWith('[') && line.includes('](');
  }

  static parseMarkdownLink(line: string): { name: string; url: string } | null {
    const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return { name: linkMatch[1], url: linkMatch[2] };
    }
    return null;
  }
}

function parseMarkdownContent(content: string, filePath: string, groupId?: string): Project | null {
  const lines = content.split('\n');
  const relativePath = filePath.replace(/\\/g, '/');
  const directoryPath = relativePath.substring(0, relativePath.lastIndexOf('/'));

  const project: Project = {
    id: relativePath,
    name: '',
    description: '',
    tasks: [],
    filePath: relativePath,
    directoryPath: directoryPath,
    groupId: groupId,
    links: []
  };

  let currentTask: Task | null = null;
  let currentItem: Item | null = null;
  let hasTaskItemStarted = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();
    const lineNumber = lineIndex + 1;

    if (trimmedLine.startsWith('## ')) {
      project.name = trimmedLine.substring(3).trim();
      continue;
    }

    if (project.name && trimmedLine.startsWith('> ')) {
      const content = trimmedLine.substring(2).trim();
      project.description = content;
      continue;
    }

    if (project.name && !currentTask && SimpleLineParser.isLinkLine(trimmedLine)) {
      const link = SimpleLineParser.parseMarkdownLink(trimmedLine);
      if (link) {
        project.links!.push(link);
      }
      continue;
    }

    if (SimpleLineParser.isTaskLine(trimmedLine)) {
      if (currentTask) {
        project.tasks.push(currentTask);
      }

      currentTask = SimpleLineParser.parseTaskLine(trimmedLine, lineNumber);
      currentTask.links = [];
      hasTaskItemStarted = false;
      currentItem = null;
      continue;
    }

    if (currentTask && trimmedLine.includes('@') && !SimpleLineParser.isTaskLine(trimmedLine)) {
      const item = SimpleLineParser.parseItemLine(trimmedLine, lineNumber);
      if (item) {
        hasTaskItemStarted = true;
        item.id = generateItemId();
        item.status = detectItemStatus(trimmedLine);
        item.links = [];
        currentTask.items.push(item);
        currentItem = item;
      }
      continue;
    }

    if (currentTask && !hasTaskItemStarted && SimpleLineParser.isLinkLine(trimmedLine)) {
      const link = SimpleLineParser.parseMarkdownLink(trimmedLine);
      if (link) {
        currentTask.links.push(link);
      }
      continue;
    }

    if (currentItem && SimpleLineParser.isLinkLine(trimmedLine)) {
      const link = SimpleLineParser.parseMarkdownLink(trimmedLine);
      if (link) {
        currentItem.links!.push(link);
      }
      continue;
    }
  }

  if (currentTask) {
    project.tasks.push(currentTask);
  }

  if (!project.name) {
    const fileName = relativePath.split('/').pop() || '';
    project.name = fileName.replace(/\.md$/i, '');
  }

  return project.name ? project : null;
}

export async function loadSettings(client: ObsidianClient): Promise<PluginSettings | null> {
  return client.getPluginSettings();
}

export async function loadProjectsAndItems(
  client: ObsidianClient,
  directories: ProjectDirectory[],
  taskTags: string[] = []
): Promise<{ projects: Project[]; items: Item[] }> {
  const enabledDirs = directories.filter(d => d.enabled);
  const projects: Project[] = [];
  const processedFiles = new Set<string>();

  const dirPaths = enabledDirs.map(d => d.path);
  const markdownFiles = await client.getMarkdownFiles(dirPaths, taskTags);

  for (const fileInfo of markdownFiles) {
    if (processedFiles.has(fileInfo.relativePath)) {
      continue;
    }
    processedFiles.add(fileInfo.relativePath);

    const content = await client.readFile(fileInfo.filePath);
    if (!content) {
      continue;
    }

    let groupId: string | undefined;
    for (const dir of enabledDirs) {
      const normalizedDirPath = dir.path.replace(/\\/g, '/');
      const normalizedFilePath = fileInfo.relativePath.replace(/\\/g, '/');
      if (normalizedFilePath.startsWith(normalizedDirPath)) {
        groupId = dir.groupId;
        break;
      }
    }

    const project = parseMarkdownContent(content, fileInfo.filePath, groupId);
    if (project) {
      projects.push(project);
    }
  }

  const items: Item[] = [];
  for (const project of projects) {
    for (const task of project.tasks) {
      for (const item of task.items) {
        item.task = task;
        item.project = project;
        items.push(item);
      }
      if (task.date && task.items.length === 0) {
        items.push({
          id: generateItemId(),
          content: task.name,
          date: task.date,
          startDateTime: task.startDateTime,
          endDateTime: task.endDateTime,
          task,
          project,
          lineNumber: task.lineNumber,
          status: 'pending'
        });
      }
    }
  }

  return { projects, items };
}
