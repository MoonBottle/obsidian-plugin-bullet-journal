import { Project, Task, Item, ItemStatus } from '../models/types';
import { LineParser } from '../utils/lineParser';
import { Vault, TFile } from 'obsidian';

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
  private vault: Vault | null;

  constructor(projectDirectories: string[], directoryConfigs?: ProjectDirectoryConfig[], vault?: Vault) {
    this.projectDirectories = projectDirectories.map(p => p.replace(/\\/g, '/'));
    this.directoryConfigs = new Map();
    this.vault = vault || null;
    if (directoryConfigs) {
      directoryConfigs.forEach(config => {
        this.directoryConfigs.set(config.path.replace(/\\/g, '/'), config);
      });
    }
  }

  /**
   * Parse all project files in all project directories
   */
  public async parseAllProjects(): Promise<Project[]> {
    const projects: Project[] = [];
    const projectFiles = await this.findProjectFiles();

    for (const { filePath, dataDir, groupId, file } of projectFiles) {
      try {
        const project = await this.parseProjectFile(filePath, dataDir, groupId, file);
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
   * Note: projectDirectories are relative paths from vault root
   */
  async findProjectFiles(): Promise<{ filePath: string; dataDir: string; groupId?: string; file: TFile }[]> {
    const projectFiles: { filePath: string; dataDir: string; groupId?: string; file: TFile }[] = [];

    if (!this.vault) {
      console.error('[BulletJournal] Vault not available');
      return projectFiles;
    }

    // Get all markdown files from vault
    const allFiles = this.vault.getMarkdownFiles();

    for (const dataDirectory of this.projectDirectories) {
      const normalizedDataDir = dataDirectory.replace(/\\/g, '/');
      const dirConfig = this.directoryConfigs.get(normalizedDataDir);
      const groupId = dirConfig?.groupId;

      // Filter files that are in this directory
      for (const file of allFiles) {
        const normalizedFilePath = file.path.replace(/\\/g, '/');
        
        // Check if file is directly in the project directory
        const fileDir = normalizedFilePath.substring(0, normalizedFilePath.lastIndexOf('/'));
        if (fileDir === normalizedDataDir || fileDir.startsWith(normalizedDataDir + '/')) {
          projectFiles.push({
            filePath: file.path,
            dataDir: dataDirectory,
            groupId: groupId,
            file: file
          });
        }
      }
    }

    return projectFiles;
  }

  /**
   * Get list of project files (for cache invalidation). Public wrapper around findProjectFiles.
   */
  public async getProjectFileList(): Promise<{ filePath: string; dataDir: string; groupId?: string; file: TFile }[]> {
    return this.findProjectFiles();
  }

  /**
   * Parse a single project file
   */
  public async parseProjectFile(filePath: string, dataDirectory: string, groupId?: string, file?: TFile): Promise<Project | null> {
    let content: string;
    
    if (file && this.vault) {
      content = await this.vault.read(file);
    } else {
      // Fallback: try to read directly (for backwards compatibility)
      try {
        const fs = require('fs');
        content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        console.error(`[BulletJournal] Failed to read file: ${filePath}`);
        return null;
      }
    }
    
    const lines = content.split('\n');

    // Use the relative path as is (already relative to vault root)
    const relativePath = filePath.replace(/\\/g, '/');

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
    let currentItem: Item | null = null;
    let hasTaskItemStarted = false;

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
      // Only parse as project link if there's no current task
      if (project.name && !currentTask && LineParser.isLinkLine(trimmedLine)) {
        const link = LineParser.parseMarkdownLink(trimmedLine);
        if (link) {
          project.links!.push(link);
        }
        continue;
      }

      // Parse tasks and items (anywhere in the file, not limited to ### 工作任务 section)
      // Check for task line
      if (LineParser.isTaskLine(trimmedLine)) {
        // Save previous task if exists
        if (currentTask) {
          project.tasks.push(currentTask);
        }

        // Parse new task with line number
        currentTask = LineParser.parseTaskLine(trimmedLine, lineNumber);
        currentTask.links = [];
        hasTaskItemStarted = false;
        currentItem = null;
        continue;
      }

      // Check for item line
      if (currentTask && trimmedLine.includes('@') && !LineParser.isTaskLine(trimmedLine)) {
        const item = LineParser.parseItemLine(trimmedLine, lineNumber);
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

      // Parse task-level links (markdown format: [name](url))
      // Links must be between task line and first item line
      if (currentTask && !hasTaskItemStarted && LineParser.isLinkLine(trimmedLine)) {
        const link = LineParser.parseMarkdownLink(trimmedLine);
        if (link) {
          currentTask.links.push(link);
        }
        continue;
      }

      // Parse item-level links (markdown format: [name](url))
      // Links must be between item line and next item/task line
      if (currentItem && LineParser.isLinkLine(trimmedLine)) {
        const link = LineParser.parseMarkdownLink(trimmedLine);
        if (link) {
          currentItem.links!.push(link);
        }
        continue;
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
      console.log('[BulletJournal Parser] Parsed project:', project);
    }

    return project.name ? project : null;
  }

  /**
   * Get all items from all projects
   */
  public async getAllItems(): Promise<Item[]> {
    const projects = await this.parseAllProjects();
    return MarkdownParser.projectsToItems(projects);
  }

  /**
   * Flatten projects to items (with task/project refs). Used for cache.
   */
  public static projectsToItems(projects: Project[]): Item[] {
    const items: Item[] = [];
    for (const project of projects) {
      for (const task of project.tasks) {
        for (const item of task.items) {
          item.task = task;
          item.project = project;
          items.push(item);
        }
      }
    }
    return items;
  }

  /**
   * Get items by date range
   */
  public async getItemsByDateRange(startDate: string, endDate: string): Promise<Item[]> {
    const allItems = await this.getAllItems();
    return allItems.filter(item => {
      return item.date >= startDate && item.date <= endDate;
    });
  }

  public async getPendingItems(): Promise<Item[]> {
    return (await this.getAllItems()).filter(item => item.status === 'pending');
  }

  public async getCompletedItems(): Promise<Item[]> {
    return (await this.getAllItems()).filter(item => item.status === 'completed');
  }

  public async getAbandonedItems(): Promise<Item[]> {
    return (await this.getAllItems()).filter(item => item.status === 'abandoned');
  }
}
