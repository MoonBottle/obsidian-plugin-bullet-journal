import { Project, Task, Item, ItemStatus } from '../models/types';
import { LineParser } from '../utils/lineParser';
import * as fs from 'fs';
import * as path from 'path';

interface ProjectDirectoryConfig {
  path: string;
  groupId?: string;
}

function generateItemId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function detectItemStatus(line: string): ItemStatus {
  if (line.includes('#done') || line.includes('#已完成')) {
    return 'completed';
  }
  if (line.includes('#abandoned') || line.includes('#已放弃')) {
    return 'abandoned';
  }
  return 'pending';
}

export class MarkdownParser {
  private projectDirectories: string[];
  private directoryConfigs: Map<string, ProjectDirectoryConfig>;
  private vaultRoot: string | null;

  constructor(projectDirectories: string[], directoryConfigs?: ProjectDirectoryConfig[], vaultRoot?: string) {
    this.projectDirectories = projectDirectories;
    this.directoryConfigs = new Map();
    this.vaultRoot = vaultRoot ? vaultRoot.replace(/\\/g, '/') : null;
    if (directoryConfigs) {
      directoryConfigs.forEach(config => {
        this.directoryConfigs.set(config.path.replace(/\\/g, '/'), config);
      });
    }
  }

  /**
   * Parse all project files in all project directories
   */
  public parseAllProjects(): Project[] {
    const projects: Project[] = [];
    const projectFiles = this.findProjectFiles();

    for (const { filePath, dataDir, groupId } of projectFiles) {
      try {
        const project = this.parseProjectFile(filePath, dataDir, groupId);
        if (project) {
          projects.push(project);
        }
      } catch (error) {
        console.error(`Error parsing project file ${filePath}:`, error);
      }
    }

    return projects;
  }

  /**
   * Find all project Markdown files in all project directories
   * Note: projectDirectories already point to the '项目' folder
   */
  private findProjectFiles(): { filePath: string; dataDir: string; groupId?: string }[] {
    const projectFiles: { filePath: string; dataDir: string; groupId?: string }[] = [];

    for (const dataDirectory of this.projectDirectories) {
      // dataDirectory already points to the '项目' folder (e.g., ".../工作安排/2026/项目")
      if (!fs.existsSync(dataDirectory)) {
        continue;
      }

      const normalizedDataDir = dataDirectory.replace(/\\/g, '/');
      const dirConfig = this.directoryConfigs.get(normalizedDataDir);
      const groupId = dirConfig?.groupId;

      const files = fs.readdirSync(dataDirectory);
      for (const file of files) {
        if (file.endsWith('.md')) {
          projectFiles.push({
            filePath: path.join(dataDirectory, file),
            dataDir: dataDirectory,
            groupId: groupId
          });
        }
      }
    }

    return projectFiles;
  }

  /**
   * Parse a single project file
   */
  public parseProjectFile(filePath: string, dataDirectory: string, groupId?: string): Project | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Convert absolute path to relative path from vault root
    // dataDirectory is like "c:\project\code\hk-work\工作安排\2026\项目"
    // We need relative path like "工作安排/2026/项目/xxx.md"
    const relativePath = this.toRelativePath(filePath, dataDirectory);

    // Extract directory path from file path (e.g., "工作安排/2026/项目/xxx.md" -> "工作安排/2026/项目")
    const directoryPath = relativePath.substring(0, relativePath.lastIndexOf('/'));

    let project: Project = {
      name: '',
      description: '',
      tasks: [],
      filePath: relativePath,
      directoryPath: directoryPath,
      groupId: groupId,
      links: []
    };

    let currentTask: Task | null = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();
      const lineNumber = lineIndex + 1; // 1-based line number

      // Parse project name
      if (trimmedLine.startsWith('## ')) {
        project.name = trimmedLine.substring(3).trim();
        continue;
      }

      // Parse project description
      if (project.name && trimmedLine.startsWith('> ')) {
        const content = trimmedLine.substring(2).trim();
        project.description = content;
        continue;
      }

      // Parse project-level links (markdown format: [name](url))
      if (project.name && trimmedLine.startsWith('[') && trimmedLine.includes('](')) {
        const linkMatch = trimmedLine.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const linkName = linkMatch[1];
          const linkUrl = linkMatch[2];
          project.links!.push({ name: linkName, url: linkUrl });
        }
        continue;
      }

      // Parse project-level gantt link (format: 甘特图：url)
      if (project.name && trimmedLine.includes('甘特图') && trimmedLine.includes('http')) {
        const ganttMatch = trimmedLine.match(/甘特图[：:]\s*(https?:\/\/\S+)/);
        if (ganttMatch) {
          project.links!.push({ name: '甘特图', url: ganttMatch[1] });
        }
        continue;
      }

      // Parse tasks and items (anywhere in the file, not limited to ### 工作任务 section)
      // Check for task line
      if (trimmedLine.includes('#任务')) {
        // Save previous task if exists
        if (currentTask) {
          project.tasks.push(currentTask);
        }

        // Parse new task with line number
        currentTask = LineParser.parseTaskLine(trimmedLine, lineNumber);
        continue;
      }

      // Check for item line
      if (currentTask && trimmedLine.includes('@') && !trimmedLine.includes('#任务')) {
        const item = LineParser.parseItemLine(trimmedLine, lineNumber);
        if (item) {
          item.id = generateItemId();
          item.status = detectItemStatus(trimmedLine);
          currentTask.items.push(item);
        }
      }
    }

    // Add the last task if exists
    if (currentTask) {
      project.tasks.push(currentTask);
    }

    // If no project name found, use the file name (without .md extension)
    if (!project.name) {
      const fileName = relativePath.split('/').pop() || '';
      project.name = fileName.replace(/\.md$/i, '');
    }

    // Log parsed project data for debugging
    if (project.name) {
      console.log('[HK-Work Parser] Parsed project:', project);
    }

    return project.name ? project : null;
  }

  /**
   * Convert absolute file path to relative path from vault root
   */
  private toRelativePath(absolutePath: string, dataDirectory: string): string {
    const normalizedPath = absolutePath.replace(/\\/g, '/');
    const normalizedDataDir = dataDirectory.replace(/\\/g, '/');

    if (this.vaultRoot && normalizedPath.startsWith(this.vaultRoot)) {
      return normalizedPath.substring(this.vaultRoot.length).replace(/^\//, '');
    }

    if (this.vaultRoot && normalizedDataDir.startsWith(this.vaultRoot)) {
      const relativeDataDir = normalizedDataDir.substring(this.vaultRoot.length).replace(/^\//, '');
      const fileName = normalizedPath.split('/').pop() || '';
      return relativeDataDir + '/' + fileName;
    }

    const fileName = normalizedPath.split('/').pop() || '';
    const dataDirName = normalizedDataDir.split('/').pop() || '';
    return dataDirName + '/' + fileName;
  }

  /**
   * Get all items from all projects
   */
  public getAllItems(): Item[] {
    const projects = this.parseAllProjects();
    const items: Item[] = [];

    for (const project of projects) {
      for (const task of project.tasks) {
        // Add items from task's sub-items
        for (const item of task.items) {
          item.task = task;
          item.project = project;
          items.push(item);
        }

        // Check if the task itself has a date/time and should be treated as an item
        if (task.date && task.items.length === 0) {
          // If task has a date but no sub-items, treat the task itself as an item
          const taskItem: Item = {
            id: generateItemId(),
            content: task.name,
            date: task.date,
            startDateTime: task.startDateTime,
            endDateTime: task.endDateTime,
            task: task,
            project: project,
            lineNumber: task.lineNumber,
            status: 'pending'
          };
          items.push(taskItem);
        }
      }
    }

    return items;
  }

  /**
   * Get items by date range
   */
  public getItemsByDateRange(startDate: string, endDate: string): Item[] {
    const allItems = this.getAllItems();
    return allItems.filter(item => {
      return item.date >= startDate && item.date <= endDate;
    });
  }

  public getPendingItems(): Item[] {
    return this.getAllItems().filter(item => item.status === 'pending');
  }

  public getCompletedItems(): Item[] {
    return this.getAllItems().filter(item => item.status === 'completed');
  }

  public getAbandonedItems(): Item[] {
    return this.getAllItems().filter(item => item.status === 'abandoned');
  }
}
