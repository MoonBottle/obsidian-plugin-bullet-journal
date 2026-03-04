import { ObsidianClient } from './obsidian-client';
import { loadProjectsAndItems } from './dataLoader';
import type { Item, ProjectDirectory } from './types';

export interface FilterItemsArgs {
  projectId?: string;
  projectIds?: string[];
  groupId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'completed' | 'abandoned';
}

export function filterItems(items: Item[], args: FilterItemsArgs): Item[] {
  let filtered = [...items];

  if (args.projectId) {
    filtered = filtered.filter(i => i.project?.id === args.projectId);
  } else if (args.projectIds?.length) {
    const set = new Set(args.projectIds);
    filtered = filtered.filter(i => i.project && set.has(i.project.id));
  } else if (args.groupId) {
    filtered = filtered.filter(i => i.project?.groupId === args.groupId);
  }

  if (args.startDate) {
    filtered = filtered.filter(i => i.date >= args.startDate!);
  }
  if (args.endDate) {
    filtered = filtered.filter(i => i.date <= args.endDate!);
  }
  if (args.status) {
    filtered = filtered.filter(i => i.status === args.status);
  }

  return filtered;
}

export interface FilterItemOutput {
  id: string;
  content: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  status: string;
  projectName?: string;
  taskName?: string;
}

export async function executeFilterItems(
  client: ObsidianClient,
  directories: ProjectDirectory[],
  taskTags: string[],
  args: FilterItemsArgs
): Promise<{ items: FilterItemOutput[] }> {
  const { items } = await loadProjectsAndItems(client, directories, taskTags);
  const filtered = filterItems(items, args);
  const output: FilterItemOutput[] = filtered.map(i => ({
    id: i.id,
    content: i.content,
    date: i.date,
    startDateTime: i.startDateTime,
    endDateTime: i.endDateTime,
    status: i.status,
    projectName: i.project?.name,
    taskName: i.task?.name
  }));
  return { items: output };
}
