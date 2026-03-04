import { App, Plugin, PluginManifest, PluginSettingTab, Setting, WorkspaceLeaf, TFile, TFolder, debounce, Notice, Menu } from 'obsidian';
import { ProjectView, PROJECT_VIEW_TYPE } from './src/views/ProjectView.tsx';
import { CalendarView, CALENDAR_VIEW_TYPE } from './src/views/CalendarView.tsx';
import { GanttView, GANTT_VIEW_TYPE } from './src/views/GanttView.tsx';
import { TodoSidebarView, TODO_SIDEBAR_VIEW_TYPE } from './src/views/TodoSidebarView.tsx';
import { taskGutterPlugin } from './src/editor/TaskGutter';
import { initI18n, t } from './src/i18n';
import { MarkdownParser } from './src/parser/markdownParser';
import type { Project, Item } from './src/models/types';

interface ProjectGroup {
  id: string;
  name: string;
}

interface ProjectDirectory {
  path: string;
  enabled: boolean;
  groupId?: string;
}

interface BulletJournalPluginSettings {
  projectDirectories: ProjectDirectory[];
  projectGroups: ProjectGroup[];
  defaultGroup: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  todoDock: {
    hideCompleted: boolean;
    hideAbandoned: boolean;
  };
  /** Tags used to discover project files when no project directories are configured (e.g. #任务, #task) */
  taskTags?: string[];
}

const DEFAULT_SETTINGS: BulletJournalPluginSettings = {
  projectDirectories: [],
  projectGroups: [],
  defaultGroup: '',
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  todoDock: {
    hideCompleted: false,
    hideAbandoned: false
  },
  taskTags: ['任务', 'task']
};

export default class BulletJournalPlugin extends Plugin {
  settings: BulletJournalPluginSettings;
  private refreshCallbacks: Set<() => void> = new Set();
  private debouncedRefresh: () => void;
  private normalizedProjectDirectories: string[] = [];
  /** Shared parse cache; updated before triggerRefresh so all views read the same data */
  private cachedProjects: Project[] | null = null;
  /** Per-file cache for incremental refresh: path -> { project, mtime } */
  private projectCache: Map<string, { project: Project | null; mtime: number }> = new Map();

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.settings = { ...DEFAULT_SETTINGS };
    // Debounce refresh: update cache once then notify all views
    this.debouncedRefresh = debounce(() => {
      this.refreshCache().then(() => this.triggerRefresh());
    }, 500, true);
  }

  async onload() {
    await this.loadSettings();
    this.updateNormalizedDataDirectory();

    // Store plugin instance globally for access from editor extensions
    (window as any).hkWorkPlugin = this;

    // Initialize i18n with Obsidian's language setting
    // @ts-ignore
    const obsidianLang = this.app.vault.getConfig?.('language') || 'zh-cn';
    initI18n(obsidianLang);

    // Register views
    this.registerView(
      PROJECT_VIEW_TYPE,
      (leaf) => new ProjectView(leaf, this)
    );

    this.registerView(
      CALENDAR_VIEW_TYPE,
      (leaf) => new CalendarView(leaf, this)
    );

    this.registerView(
      GANTT_VIEW_TYPE,
      (leaf) => new GanttView(leaf, this)
    );

    this.registerView(
      TODO_SIDEBAR_VIEW_TYPE,
      (leaf) => new TodoSidebarView(leaf, this)
    );

    // Add commands
    this.addCommand({
      id: 'open-project-view',
      name: 'Open Project View',
      callback: () => this.openView(PROJECT_VIEW_TYPE)
    });

    this.addCommand({
      id: 'open-calendar-view',
      name: 'Open Calendar View',
      callback: () => this.openView(CALENDAR_VIEW_TYPE)
    });

    this.addCommand({
      id: 'open-gantt-view',
      name: 'Open Gantt Chart View',
      callback: () => this.openView(GANTT_VIEW_TYPE)
    });

    this.addCommand({
      id: 'refresh-bullet-journal-data',
      name: 'Refresh Bullet Journal Data',
      callback: () => this.debouncedRefresh()
    });

    this.addCommand({
      id: 'open-todo-sidebar',
      name: 'Open Todo Sidebar',
      callback: () => this.openTodoSidebar()
    });

    // Add setting tab
    this.addSettingTab(new BulletJournalSettingTab(this.app, this));

    // Add ribbon icon for todo sidebar (placed first to appear below in the sidebar)
    this.addRibbonIcon('check-circle', '打开待办事项', (evt) => {
      this.openTodoSidebar();
    });

    // Add ribbon icon with menu
    this.addRibbonIcon('calendar', '子弹笔记', (evt) => {
      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle('日历视图')
          .setIcon('calendar')
          .onClick(() => this.openView(CALENDAR_VIEW_TYPE))
      );
      menu.addItem((item) =>
        item
          .setTitle('甘特图视图')
          .setIcon('git-commit')
          .onClick(() => this.openView(GANTT_VIEW_TYPE))
      );
      menu.addItem((item) =>
        item
          .setTitle('项目视图')
          .setIcon('folder')
          .onClick(() => this.openView(PROJECT_VIEW_TYPE))
      );
      menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    });

    // Register file change listener
    this.registerFileWatcher();

    // Register editor extension
    this.registerEditorExtension(taskGutterPlugin);

    // Register file menu for folder context menu
    this.registerFileMenuHandler();
  }

  /**
   * Register file menu handler for folder context menu
   */
  private registerFileMenuHandler(): void {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        // Only show for folders
        if (!(file instanceof TFolder)) {
          return;
        }

        const folderPath = file.path;

        // Check if folder is already in project directories
        const isAlreadyAdded = this.settings.projectDirectories.some(
          dir => dir.path === folderPath
        );

        menu.addItem((item) => {
          item
            .setTitle(t('fileMenu').addAsProjectDirectory)
            .setIcon('folder-plus')
            .onClick(async () => {
              if (isAlreadyAdded) {
                // Show notification that directory already exists
                new Notice(t('fileMenu').alreadyExists);
                return;
              }

              // Add new directory
              this.settings.projectDirectories.push({
                path: folderPath,
                enabled: true,
              });

              await this.saveSettings();

              // Show success notification
              new Notice(t('fileMenu').addSuccess);
            });
        });
      })
    );
  }

  onunload() {
    this.refreshCallbacks.clear();
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.updateNormalizedDataDirectory();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateNormalizedDataDirectory();
    // Trigger refresh when settings change
    this.debouncedRefresh();
  }

  private updateNormalizedDataDirectory() {
    this.normalizedProjectDirectories = this.settings.projectDirectories
      .filter(dir => dir.enabled && dir.path)
      .map(dir => dir.path.replace(/\\/g, '/'));
  }

  /**
   * Register a callback to be called when data should be refreshed
   */
  onRefresh(callback: () => void): () => void {
    this.refreshCallbacks.add(callback);
    return () => {
      this.refreshCallbacks.delete(callback);
    };
  }

  /**
   * Update shared cache by parsing all project files. Call before triggerRefresh().
   * Uses per-file cache: only re-parses files whose mtime changed.
   * When no project directories are configured, discovers files by taskTags (#任务, #task) via metadataCache.
   */
  async refreshCache(): Promise<void> {
    const dirConfigs: { path: string; groupId?: string }[] = [];
    for (const d of this.settings.projectDirectories) {
      if (d.enabled && d.path) {
        dirConfigs.push({ path: d.path, groupId: d.groupId });
      }
    }
    const enabledDirs = dirConfigs.map(d => d.path);

    if (enabledDirs.length > 0) {
      const parser = new MarkdownParser(enabledDirs, dirConfigs, this.app.vault);
      try {
        const fileList = await parser.getProjectFileList();
        const nextProjects: Project[] = [];
        for (const { filePath, dataDir, groupId, file } of fileList) {
          const mtime = file.stat.mtime;
          const cached = this.projectCache.get(filePath);
          let project: Project | null;
          if (cached && cached.mtime === mtime) {
            project = cached.project;
          } else {
            project = await parser.parseProjectFile(filePath, dataDir, groupId, file);
            this.projectCache.set(filePath, { project, mtime });
          }
          if (project) {
            nextProjects.push(project);
          }
        }
        for (const path of this.projectCache.keys()) {
          if (!fileList.some(f => f.filePath === path)) {
            this.projectCache.delete(path);
          }
        }
        this.cachedProjects = nextProjects;
      } catch (error) {
        console.error('[BulletJournal] refreshCache error:', error);
        this.cachedProjects = [];
      }
      return;
    }

    // No directories configured: discover by task tags
    const fileList = await this.getProjectFilesByTag();
    if (fileList.length === 0) {
      this.cachedProjects = [];
      this.projectCache.clear();
      return;
    }
    const parser = new MarkdownParser([], [], this.app.vault);
    try {
      const nextProjects: Project[] = [];
      for (const { filePath, dataDir, groupId, file } of fileList) {
        const mtime = file.stat.mtime;
        const cached = this.projectCache.get(filePath);
        let project: Project | null;
        if (cached && cached.mtime === mtime) {
          project = cached.project;
        } else {
          project = await parser.parseProjectFile(filePath, dataDir, groupId, file);
          this.projectCache.set(filePath, { project, mtime });
        }
        if (project) {
          nextProjects.push(project);
        }
      }
      for (const path of this.projectCache.keys()) {
        if (!fileList.some(f => f.filePath === path)) {
          this.projectCache.delete(path);
        }
      }
      this.cachedProjects = nextProjects;
    } catch (error) {
      console.error('[BulletJournal] refreshCache (tag) error:', error);
      this.cachedProjects = [];
    }
  }

  /**
   * Get project files by scanning all markdown files and matching taskTags in metadataCache.
   * Used when no project directories are configured.
   */
  private async getProjectFilesByTag(): Promise<{ filePath: string; dataDir: string; groupId?: string; file: TFile }[]> {
    const tags = this.settings.taskTags ?? ['任务', 'task'];
    const normalizedTags = new Set(tags.map(t => this.normalizeTag(t)));
    const files = this.app.vault.getMarkdownFiles();
    const result: { filePath: string; dataDir: string; groupId?: string; file: TFile }[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.tags) continue;
      const hasTag = cache.tags.some((t: { tag: string }) => normalizedTags.has(this.normalizeTag(t.tag)));
      if (!hasTag) continue;
      const path = file.path.replace(/\\/g, '/');
      const dataDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      result.push({ filePath: file.path, dataDir, file });
    }
    return result;
  }

  private normalizeTag(tag: string): string {
    return tag.replace(/^#/, '').toLowerCase().trim();
  }

  /**
   * Get projects from cache. If cache is empty, refresh first (e.g. first view open).
   */
  async getCachedProjects(): Promise<Project[]> {
    if (this.cachedProjects === null) {
      await this.refreshCache();
    }
    return this.cachedProjects ?? [];
  }

  /**
   * Get all items from cached projects (flattened). If cache is empty, refresh first.
   */
  async getCachedItems(): Promise<Item[]> {
    const projects = await this.getCachedProjects();
    return MarkdownParser.projectsToItems(projects);
  }

  /**
   * Refresh cache and notify all views immediately (e.g. after user edits file from UI).
   */
  async refreshDataNow(): Promise<void> {
    await this.refreshCache();
    this.triggerRefresh();
  }

  /**
   * Trigger refresh for all registered views (cache must already be updated via refreshCache).
   */
  triggerRefresh(): void {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error during refresh:', error);
      }
    });
  }

  /**
   * Register file system watcher for data directory
   */
  private registerFileWatcher(): void {
    const requestRefresh = () => this.debouncedRefresh();
    // Watch for file modifications
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (this.isDataFile(file)) {
          requestRefresh();
        }
      })
    );

    // Watch for file creations
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (this.isDataFile(file)) {
          requestRefresh();
        }
      })
    );

    // Watch for file deletions
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (this.isDataFile(file)) {
          requestRefresh();
        }
      })
    );

    // Watch for file renames
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        if (this.isDataFile(file) || this.isPathInDataDirectory(oldPath)) {
          requestRefresh();
        }
      })
    );
  }

  /**
   * Check if a file is in any of the project directories, or (when no dirs) if it has a task tag.
   */
  private isDataFile(file: TFile): boolean {
    if (this.normalizedProjectDirectories.length > 0) {
      return this.isPathInDataDirectory(file.path);
    }
    return this.fileHasTaskTag(file);
  }

  private fileHasTaskTag(file: TFile): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    return this.cacheHasTaskTag(cache);
  }

  private pathHasTaskTag(path: string): boolean {
    const cache = this.app.metadataCache.getCache(path);
    return this.cacheHasTaskTag(cache);
  }

  private cacheHasTaskTag(cache: { tags?: { tag: string }[] } | null): boolean {
    if (!cache?.tags?.length) return false;
    const tags = this.settings.taskTags ?? ['任务', 'task'];
    const normalized = new Set(tags.map(t => this.normalizeTag(t)));
    return cache.tags.some((t: { tag: string }) => normalized.has(this.normalizeTag(t.tag)));
  }

  /**
   * Check if a path is within any of the project directories, or (when no dirs) if that path had a task tag.
   */
  private isPathInDataDirectory(filePath: string): boolean {
    if (this.normalizedProjectDirectories.length > 0) {
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      return this.normalizedProjectDirectories.some(dir => normalizedFilePath.startsWith(dir));
    }
    return this.pathHasTaskTag(filePath);
  }

  /**
   * Get group ID for a project file path
   * Uses the configured directory paths from settings to determine the group
   */
  getGroupIdForPath(filePath: string): string | undefined {
    const normalizedFilePath = filePath.replace(/\\/g, '/');

    // Find the longest matching directory path
    let matchedDir: ProjectDirectory | null = null;
    let matchedLength = 0;

    for (const dir of this.settings.projectDirectories) {
      if (!dir.enabled || !dir.path) continue;

      const normalizedDirPath = dir.path.replace(/\\/g, '/');

      // Check if file path starts with directory path
      if (normalizedFilePath.startsWith(normalizedDirPath)) {
        // Use the longest match (most specific)
        if (normalizedDirPath.length > matchedLength) {
          matchedLength = normalizedDirPath.length;
          matchedDir = dir;
        }
      }
    }

    return matchedDir?.groupId;
  }

  /**
   * Get all available groups
   */
  getProjectGroups(): ProjectGroup[] {
    return this.settings.projectGroups;
  }

  /**
   * Get default group ID
   */
  getDefaultGroup(): string {
    return this.settings.defaultGroup;
  }

  private async openView(viewType: string) {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const existingLeaf = workspace.getLeavesOfType(viewType)[0];

    if (existingLeaf) {
      leaf = existingLeaf;
    } else {
      // Try to get a main area leaf first
      leaf = workspace.getLeaf(false);
      if (!leaf) {
        // If no main area leaf, create one by splitting the active leaf
        const activeLeaf = workspace.activeLeaf;
        if (activeLeaf) {
          leaf = workspace.createLeafBySplit(activeLeaf, 'horizontal');
        }
      }
      if (leaf) {
        await leaf.setViewState({
          type: viewType,
          active: true
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private async openTodoSidebar() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(TODO_SIDEBAR_VIEW_TYPE)[0];

    if (!leaf) {
      const newLeaf = workspace.getRightLeaf(false);
      if (newLeaf) {
        await newLeaf.setViewState({
          type: TODO_SIDEBAR_VIEW_TYPE,
          active: true
        });
        leaf = newLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}

class BulletJournalSettingTab extends PluginSettingTab {
  plugin: BulletJournalPlugin;

  constructor(app: App, plugin: BulletJournalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // Header
    containerEl.createEl('h2', { text: t('settings').title });

    // Project Directories Section
    new Setting(containerEl)
      .setName(t('settings').projectDirectories.title)
      .setDesc(t('settings').projectDirectories.description)
      .setHeading();

    const projectDirsContainer = containerEl.createDiv({ cls: 'bullet-journal-dirs-container' });
    this.renderProjectDirectories(containerEl);

    // Project Groups Section
    new Setting(containerEl)
      .setName(t('settings').projectGroups.title)
      .setDesc(t('settings').projectGroups.description)
      .setHeading()
      .addButton(button => button
        .setButtonText(t('settings').projectGroups.addButton)
        .setCta()
        .onClick(() => {
          const newGroup: ProjectGroup = {
            id: 'group-' + Date.now(),
            name: ''
          };
          this.plugin.settings.projectGroups.push(newGroup);
          this.plugin.saveSettings();
          this.renderProjectGroups(groupsContainer, containerEl);
          this.renderDefaultGroupDropdown(defaultGroupContainer);
          this.renderProjectDirectories(containerEl);
        }));

    // Create a container for groups to ensure correct positioning
    const groupsContainer = containerEl.createDiv({ cls: 'bullet-journal-groups-container' });
    this.renderProjectGroups(groupsContainer, containerEl);

    // Default Group Setting - use container for dynamic refresh
    const defaultGroupContainer = containerEl.createDiv({ cls: 'bullet-journal-default-group-container' });
    this.renderDefaultGroupDropdown(defaultGroupContainer);

    // Lunch Break Setting
    new Setting(containerEl)
      .setName(t('settings').lunchBreak.title)
      .setDesc(t('settings').lunchBreak.description)
      .setHeading();

    new Setting(containerEl)
      .setName(t('settings').lunchBreak.start.title)
      .setDesc(t('settings').lunchBreak.start.description)
      .addText(text => text
        .setPlaceholder('12:00')
        .setValue(this.plugin.settings.lunchBreakStart)
        .onChange(async (value) => {
          // Validate time format HH:mm
          if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
            this.plugin.settings.lunchBreakStart = value;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName(t('settings').lunchBreak.end.title)
      .setDesc(t('settings').lunchBreak.end.description)
      .addText(text => text
        .setPlaceholder('13:00')
        .setValue(this.plugin.settings.lunchBreakEnd)
        .onChange(async (value) => {
          // Validate time format HH:mm
          if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
            this.plugin.settings.lunchBreakEnd = value;
            await this.plugin.saveSettings();
          }
        }));

  }

  private renderDefaultGroupDropdown(container: HTMLElement): void {
    container.empty();

    new Setting(container)
      .setName(t('settings').projectGroups.defaultGroupTitle)
      .setDesc(t('settings').projectGroups.defaultGroupDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('', t('settings').projectGroups.allGroups);
        this.plugin.settings.projectGroups.forEach(group => {
          dropdown.addOption(group.id, group.name || t('settings').projectGroups.unnamed);
        });
        dropdown.setValue(this.plugin.settings.defaultGroup);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultGroup = value;
          await this.plugin.saveSettings();
        });
        return dropdown;
      });
  }

  private renderProjectGroups(groupsContainer: HTMLElement, mainContainer: HTMLElement): void {
    groupsContainer.empty();

    if (this.plugin.settings.projectGroups.length === 0) {
      new Setting(groupsContainer)
        .setDesc(t('settings').projectGroups.emptyMessage)
        .setClass('bullet-journal-group-setting');
      return;
    }

    this.plugin.settings.projectGroups.forEach((group, index) => {
      const setting = new Setting(groupsContainer)
        .setClass('bullet-journal-group-setting')
        .addText(text => text
          .setPlaceholder(t('settings').projectGroups.namePlaceholder)
          .setValue(group.name)
          .onChange(async (value) => {
            this.plugin.settings.projectGroups[index].name = value;
            await this.plugin.saveSettings();
            const defaultGroupContainer = mainContainer.querySelector('.bullet-journal-default-group-container') as HTMLElement;
            if (defaultGroupContainer) {
              this.renderDefaultGroupDropdown(defaultGroupContainer);
            }
            this.renderProjectDirectories(mainContainer);
          }))
        .addButton(button => button
          .setButtonText(t('settings').projectGroups.deleteButton)
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.projectDirectories.forEach(dir => {
              if (dir.groupId === group.id) {
                dir.groupId = undefined;
              }
            });
            this.plugin.settings.projectGroups.splice(index, 1);
            if (this.plugin.settings.defaultGroup === group.id) {
              this.plugin.settings.defaultGroup = '';
            }
            await this.plugin.saveSettings();
            this.renderProjectGroups(groupsContainer, mainContainer);
            this.renderProjectDirectories(mainContainer);
            const defaultGroupContainer = mainContainer.querySelector('.bullet-journal-default-group-container') as HTMLElement;
            if (defaultGroupContainer) {
              this.renderDefaultGroupDropdown(defaultGroupContainer);
            }
          }));
    });
  }

  private renderProjectDirectories(containerEl: HTMLElement): void {
    const target = (containerEl.querySelector('.bullet-journal-dirs-container') || containerEl) as HTMLElement;
    // Remove existing directory settings
    target.querySelectorAll('.bullet-journal-dir-setting').forEach(el => el.remove());

    if (this.plugin.settings.projectDirectories.length === 0) {
      new Setting(target)
        .setDesc(t('settings').projectDirectories.emptyMessage)
        .setClass('bullet-journal-dir-setting');
      return;
    }

    this.plugin.settings.projectDirectories.forEach((dir, index) => {
      const groupOptions: Record<string, string> = { '': t('settings').projectGroups.noGroup };
      this.plugin.settings.projectGroups.forEach(group => {
        groupOptions[group.id] = group.name || t('settings').projectGroups.unnamed;
      });

      const setting = new Setting(target)
        .setName(dir.path || t('settings').projectDirectories.noPath)
        .setClass('bullet-journal-dir-setting');
      if (this.plugin.settings.projectGroups.length > 0) {
        setting.addDropdown(dropdown => dropdown
          .addOptions(groupOptions)
          .setValue(dir.groupId || '')
          .onChange(async (value) => {
            this.plugin.settings.projectDirectories[index].groupId = value || undefined;
            await this.plugin.saveSettings();
          }));
      }

      setting
        .addToggle(toggle => toggle
          .setValue(dir.enabled)
          .onChange(async (value) => {
            this.plugin.settings.projectDirectories[index].enabled = value;
            await this.plugin.saveSettings();
            this.renderProjectDirectories(containerEl);
          }))
        .addButton(button => button
          .setButtonText(t('settings').projectDirectories.deleteButton)
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.projectDirectories.splice(index, 1);
            await this.plugin.saveSettings();
            this.renderProjectDirectories(containerEl);
          }));

      // Add disabled styling
      if (!dir.enabled) {
        setting.settingEl.style.opacity = '0.5';
      }
    });
  }
}
