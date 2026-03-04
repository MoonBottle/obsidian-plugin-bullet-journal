/**
 * Obsidian Vault 客户端（Node 环境）
 * 直接从文件系统读取 Obsidian vault 数据
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ObsidianClientConfig {
  vaultPath: string;
}

export interface PluginSettings {
  projectDirectories: Array<{
    path: string;
    enabled: boolean;
    groupId?: string;
  }>;
  projectGroups: Array<{
    id: string;
    name: string;
  }>;
  defaultGroup: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  todoDock: {
    hideCompleted: boolean;
    hideAbandoned: boolean;
  };
  taskTags?: string[];
}

export interface MarkdownFileInfo {
  filePath: string;
  relativePath: string;
}

const DEFAULT_TASK_TAGS = ['任务', 'task'];

export class ObsidianClient {
  private vaultPath: string;

  constructor(config: ObsidianClientConfig) {
    this.vaultPath = config.vaultPath;
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  private normalizeTag(tag: string): string {
    return tag.replace(/^#/, '').toLowerCase().trim();
  }

  async getPluginSettings(): Promise<PluginSettings | null> {
    try {
      const settingsPath = path.join(
        this.vaultPath,
        '.obsidian',
        'plugins',
        'obsidian-plugin-bullet-journal',
        'data.json'
      );

      if (!fs.existsSync(settingsPath)) {
        console.error('[ObsidianClient] Plugin settings file not found:', settingsPath);
        return null;
      }

      const content = await fs.promises.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as PluginSettings;
      return settings;
    } catch (error) {
      console.error('[ObsidianClient] Failed to read plugin settings:', error);
      return null;
    }
  }

  async getMarkdownFiles(directories: string[], taskTags: string[]): Promise<MarkdownFileInfo[]> {
    const normalizedDirectories = directories.map(d => this.normalizePath(d));
    const tags = taskTags.length > 0 ? taskTags : DEFAULT_TASK_TAGS;
    const normalizedTags = new Set(tags.map(t => this.normalizeTag(t)));

    if (normalizedDirectories.length > 0) {
      return this.getFilesFromDirectories(normalizedDirectories);
    }

    return this.getFilesByTags(normalizedTags);
  }

  private async getFilesFromDirectories(directories: string[]): Promise<MarkdownFileInfo[]> {
    const result: MarkdownFileInfo[] = [];

    for (const dir of directories) {
      const fullDirPath = path.isAbsolute(dir) ? dir : path.join(this.vaultPath, dir);

      if (!fs.existsSync(fullDirPath)) {
        console.warn('[ObsidianClient] Directory not found:', fullDirPath);
        continue;
      }

      await this.scanDirectory(fullDirPath, result);
    }

    return result;
  }

  private async scanDirectory(dirPath: string, result: MarkdownFileInfo[]): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '.obsidian' || entry.name === '.trash') {
          continue;
        }
        await this.scanDirectory(fullPath, result);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(this.vaultPath, fullPath);
        result.push({
          filePath: fullPath,
          relativePath: this.normalizePath(relativePath)
        });
      }
    }
  }

  private async getFilesByTags(normalizedTags: Set<string>): Promise<MarkdownFileInfo[]> {
    const result: MarkdownFileInfo[] = [];
    await this.scanDirectoryByTags(this.vaultPath, result, normalizedTags);
    return result;
  }

  private async scanDirectoryByTags(
    dirPath: string,
    result: MarkdownFileInfo[],
    normalizedTags: Set<string>
  ): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '.obsidian' || entry.name === '.trash') {
          continue;
        }
        await this.scanDirectoryByTags(fullPath, result, normalizedTags);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const hasTag = await this.fileHasMatchingTag(fullPath, normalizedTags);
        if (hasTag) {
          const relativePath = path.relative(this.vaultPath, fullPath);
          result.push({
            filePath: fullPath,
            relativePath: this.normalizePath(relativePath)
          });
        }
      }
    }
  }

  private async fileHasMatchingTag(filePath: string, normalizedTags: Set<string>): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const frontmatterTags = this.extractFrontmatterTags(content);

      for (const tag of frontmatterTags) {
        if (normalizedTags.has(this.normalizeTag(tag))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[ObsidianClient] Failed to read file for tag matching:', filePath, error);
      return false;
    }
  }

  private extractFrontmatterTags(content: string): string[] {
    const tags: string[] = [];

    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!frontmatterMatch) {
      return tags;
    }

    const frontmatter = frontmatterMatch[1];

    const singleTagMatch = frontmatter.match(/^tags:\s*\[?(.+?)\]?\s*$/m);
    if (singleTagMatch) {
      const tagStr = singleTagMatch[1].trim();
      if (tagStr.includes(',')) {
        const parsedTags = tagStr.split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
        tags.push(...parsedTags.filter(t => t.length > 0));
      } else if (tagStr.includes(' ')) {
        const parsedTags = tagStr.split(/\s+/).map(t => t.trim());
        tags.push(...parsedTags.filter(t => t.length > 0));
      } else {
        tags.push(tagStr.replace(/^['"]|['"]$/g, ''));
      }
    }

    const listTagsMatch = frontmatter.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
    if (listTagsMatch) {
      const listContent = listTagsMatch[1];
      const listItems = listContent.matchAll(/^\s+-\s+(.+)$/gm);
      for (const match of listItems) {
        const tag = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (tag.length > 0) {
          tags.push(tag);
        }
      }
    }

    const inlineTagMatches = content.matchAll(/#[\w\u4e00-\u9fa5\-_\/]+/g);
    for (const match of inlineTagMatches) {
      tags.push(match[0]);
    }

    return tags;
  }

  async readFile(relativePath: string): Promise<string | null> {
    try {
      const fullPath = path.isAbsolute(relativePath)
        ? relativePath
        : path.join(this.vaultPath, relativePath);

      if (!fs.existsSync(fullPath)) {
        console.error('[ObsidianClient] File not found:', fullPath);
        return null;
      }

      const content = await fs.promises.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      console.error('[ObsidianClient] Failed to read file:', relativePath, error);
      return null;
    }
  }

  getVaultPath(): string {
    return this.vaultPath;
  }
}
