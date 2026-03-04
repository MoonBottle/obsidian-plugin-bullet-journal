#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ObsidianClient } from './obsidian-client';
import { loadSettings } from './dataLoader';
import { executeListProjects } from './listProjects';
import { executeFilterItems } from './filterItems';

async function main() {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    console.error('[Bullet Journal MCP] VAULT_PATH is required');
    process.exit(1);
  }

  const taskTagsEnv = process.env.TASK_TAGS;
  const taskTags: string[] = taskTagsEnv
    ? taskTagsEnv.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : ['任务', 'task'];

  const client = new ObsidianClient({ vaultPath });

  console.error('[Bullet Journal MCP] 服务已就绪');

  const server = new McpServer({
    name: 'obsidian-bullet-journal-assistant',
    version: '0.6.0'
  });

  server.registerTool(
    'list_groups',
    {
      description: '查询子弹笔记中配置的所有分组。返回分组列表，每项含 id、name。id 可用于 filter_items 的 groupId 或 list_projects 的 groupId 参数进行过滤。无参数。',
      inputSchema: z.object({})
    },
    async () => {
      const settings = await loadSettings(client);
      const groups = settings?.projectGroups || [];
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(groups, null, 2) }]
      };
    }
  );

  server.registerTool(
    'list_projects',
    {
      description: '查询子弹笔记中的所有项目。返回项目列表，每项含 id、name、description、path、groupId、taskCount。id 可用于 filter_items 的 projectId 或 projectIds 参数。可选 groupId 过滤，值来自 list_groups 返回的 id。',
      inputSchema: z.object({
        groupId: z.string().optional().describe('分组 ID，来自 list_groups 返回的 id，不传则返回全部项目')
      })
    },
    async (args) => {
      const settings = await loadSettings(client);
      const directories = settings?.projectDirectories || [];
      const result = await executeListProjects(client, directories, taskTags, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.registerTool(
    'filter_items',
    {
      description: '按项目、时间范围、分组、状态筛选子弹笔记事项。参数均为可选，可组合使用。projectId 与 projectIds 二选一；groupId 来自 list_groups；startDate/endDate 格式 YYYY-MM-DD；status 枚举：pending=待办、completed=已完成、abandoned=已放弃。',
      inputSchema: z.object({
        projectId: z.string().optional().describe('项目文档 ID，来自 list_projects 返回的 id'),
        projectIds: z.array(z.string()).optional().describe('项目 ID 数组，多选时使用'),
        groupId: z.string().optional().describe('分组 ID，来自 list_groups 返回的 id'),
        startDate: z.string().optional().describe('起始日期，格式 YYYY-MM-DD'),
        endDate: z.string().optional().describe('结束日期，格式 YYYY-MM-DD'),
        status: z.enum(['pending', 'completed', 'abandoned']).optional()
          .describe('pending=待办, completed=已完成, abandoned=已放弃')
      })
    },
    async (args) => {
      const settings = await loadSettings(client);
      const directories = settings?.projectDirectories || [];
      const result = await executeFilterItems(client, directories, taskTags, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[Bullet Journal MCP] Fatal error:', err);
  process.exit(1);
});
