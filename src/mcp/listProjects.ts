/**
 * list_projects 工具完整实现（纯函数 + execute 编排）
 */
import { ObsidianClient } from './obsidian-client';
import { loadProjectsAndItems } from './dataLoader';
import type { Project, ProjectDirectory } from './types';

export interface ListProjectsArgs {
  groupId?: string;
}

export interface ListProjectOutput {
  id: string;
  name: string;
  description: string | undefined;
  path: string;
  groupId: string | undefined;
  taskCount: number;
}

/**
 * 根据项目列表与参数构建 list_projects 的返回结构。
 * 当 args.groupId 存在时只保留 p.groupId === args.groupId 的项目。
 */
export function buildListProjectsResult(
  projects: Project[],
  args: ListProjectsArgs
): ListProjectOutput[] {
  const filtered = args.groupId
    ? projects.filter(p => p.groupId === args.groupId)
    : projects;
  return filtered.map(p => ({
    id: p.id || p.filePath || '',
    name: p.name,
    description: p.description,
    path: p.filePath || '',
    groupId: p.groupId,
    taskCount: p.tasks.length
  }));
}

/**
 * 执行 list_projects 的完整流程：从 Obsidian 拉项目，再按 args 过滤并返回与 tool 一致的结构。
 * 供 server 的 list_projects 与集成测试直接调用。
 */
export async function executeListProjects(
  client: ObsidianClient,
  directories: ProjectDirectory[],
  taskTags: string[],
  args: ListProjectsArgs
): Promise<{ projects: ListProjectOutput[] }> {
  const { projects } = await loadProjectsAndItems(client, directories, taskTags);
  return { projects: buildListProjectsResult(projects, args) };
}
