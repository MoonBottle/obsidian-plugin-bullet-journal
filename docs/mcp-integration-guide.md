# 子弹笔记 MCP 功能介绍：让 AI 成为你的任务管理助手

> 本文介绍如何将 Obsidian 子弹笔记插件与 Cursor、Claude 等 AI 助手集成，实现智能化的任务管理和工作规划。

---

![封面图 - MCP 功能概览](./images/mcp-cover.png)

## 目录

1. [什么是 MCP？](#什么是-mcp)
2. [功能亮点](#功能亮点)
3. [快速开始](#快速开始)
4. [实际应用场景](#实际应用场景)
5. [配置详解](#配置详解)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## 什么是 MCP？

MCP（Model Context Protocol，模型上下文协议）是由 Anthropic 推出的开放标准，旨在让 AI 助手能够安全地访问和操作本地数据。

对于子弹笔记用户来说，这意味着：

- **AI 能读懂你的任务** - 不再需要在 AI 对话框里手动复制粘贴任务列表
- **智能问答** - 直接问 AI "我这周有哪些任务？"、"项目 A 的进度如何？"
- **主动建议** - AI 可以根据你的任务数据提供工作规划建议

![MCP 架构示意图](./images/mcp-architecture.png)

---

## 功能亮点

### 🔌 三个核心工具

我们的 MCP 服务器为 AI 助手提供了三个强大的数据访问工具：

| 工具 | 功能 | 使用场景 |
|------|------|----------|
| `list_groups` | 列出所有项目分组 | 了解项目组织结构 |
| `list_projects` | 列出所有项目 | 获取项目概览 |
| `filter_items` | 筛选任务事项 | 精确查询特定任务 |

### 🎯 灵活的筛选能力

`filter_items` 工具支持多种筛选条件，满足各种查询需求：

- **按项目筛选** - 查看特定项目的所有任务
- **按分组筛选** - 查看某个分组下的全部任务
- **按日期筛选** - 查询本周、本月或任意时间范围的任务
- **按状态筛选** - 筛选待办、已完成或已放弃的任务

![筛选功能演示](./images/filter-demo.png)

### 🔄 实时数据同步

- 在 Obsidian 中修改任务后，AI 助手立即能看到最新数据
- 无需手动导出或复制数据
- 支持增量更新，响应迅速

---

## 快速开始

### 第一步：安装插件

1. 在 Obsidian 社区插件市场搜索 "Bullet Journal"
2. 点击安装并启用插件

![插件安装界面](./images/plugin-install.png)

### 第二步：配置项目目录

1. 打开 Obsidian 设置 → Bullet Journal
2. 添加你的项目文档目录
3. （可选）创建项目分组，如"工作"、"个人"、"学习"

![设置界面](./images/settings-config.png)

### 第三步：生成 MCP 配置

1. 在设置中找到 "MCP 配置" 部分
2. 点击 "复制 MCP 配置" 按钮
3. 配置已复制到剪贴板

![MCP 配置界面](./images/mcp-config-ui.png)

### 第四步：在 AI 助手中配置

#### Cursor 配置

1. 打开 Cursor Settings → MCP
2. 点击 "Add new MCP server"
3. 粘贴复制的配置
4. 保存并启用

![Cursor 配置界面](./images/cursor-mcp-settings.png)

#### Claude Desktop 配置

1. 打开 Claude Desktop 设置
2. 找到 MCP 配置部分
3. 粘贴配置并保存
4. 重启 Claude Desktop

![Claude 配置界面](./images/claude-mcp-settings.png)

### 第五步：开始使用

现在你可以直接向 AI 助手提问了！

**示例对话：**

> **你：** 我这周有哪些待办任务？
>
> **AI：** 我来帮你查询一下本周的待办任务...
> 
> 根据你的子弹笔记数据，本周（2026-03-03 至 2026-03-09）你有以下待办任务：
> 
> **工作项目：**
> - [ ] 完成 MCP 功能开发 @2026-03-05
> - [ ] 编写技术文档 @2026-03-06
> 
> **个人项目：**
> - [ ] 阅读《深度工作》@2026-03-07
>
> 总共 3 个待办任务，建议优先处理工作项目中的开发任务。

![AI 对话示例](./images/ai-conversation.png)

---

## 实际应用场景

### 场景一：每日晨会准备

**传统方式：**
- 打开 Obsidian，切换到日历视图
- 手动查看今天的任务
- 整理成文字发给团队

**使用 MCP：**
> "帮我总结今天的工作安排，按优先级排序"

AI 自动查询今日任务，生成结构化的工作安排：

![晨会准备示例](./images/morning-standup.png)

### 场景二：周回顾与规划

**传统方式：**
- 翻找过去一周的笔记
- 手动统计完成情况
- 思考下周计划

**使用 MCP：**
> "回顾上周完成了哪些任务？下周还有哪些待办？"

AI 自动分析数据，生成周报：

![周回顾示例](./images/weekly-review.png)

### 场景三：项目进度追踪

**传统方式：**
- 逐个打开项目文档
- 手动统计任务完成度
- 制作进度报告

**使用 MCP：**
> "项目 A 的进度如何？还剩多少任务？"

AI 实时分析项目数据：

![项目进度示例](./images/project-progress.png)

### 场景四：智能工作建议

**传统方式：**
- 凭感觉安排工作
- 容易遗漏重要任务
- 时间安排不合理

**使用 MCP：**
> "根据我的任务情况，帮我规划本周工作"

AI 基于数据分析给出建议：

![智能建议示例](./images/smart-suggestions.png)

---

## 配置详解

### MCP 配置结构

```json
{
  "mcpServers": {
    "obsidian-bullet-journal-assistant": {
      "command": "node",
      "args": ["/path/to/vault/.obsidian/plugins/obsidian-plugin-bullet-journal/mcp-server.js"],
      "env": {
        "VAULT_PATH": "/path/to/vault"
      }
    }
  }
}
```

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `VAULT_PATH` | 是 | Obsidian 仓库的绝对路径 |
| `TASK_TAGS` | 否 | 任务标签，默认 `"任务,task"` |

### 高级配置

#### 自定义任务标签

如果你的笔记使用其他标签标记任务，可以通过环境变量自定义：

```json
{
  "env": {
    "VAULT_PATH": "/path/to/vault",
    "TASK_TAGS": "todo,任务,action"
  }
}
```

#### 多仓库配置

如果你有多个 Obsidian 仓库，可以配置多个 MCP 服务器：

```json
{
  "mcpServers": {
    "bullet-journal-work": {
      "command": "node",
      "args": ["/path/to/work-vault/.obsidian/plugins/obsidian-plugin-bullet-journal/mcp-server.js"],
      "env": { "VAULT_PATH": "/path/to/work-vault" }
    },
    "bullet-journal-personal": {
      "command": "node",
      "args": ["/path/to/personal-vault/.obsidian/plugins/obsidian-plugin-bullet-journal/mcp-server.js"],
      "env": { "VAULT_PATH": "/path/to/personal-vault" }
    }
  }
}
```

![多仓库配置示例](./images/multi-vault-config.png)

---

## 最佳实践

### 1. 项目分组策略

建议按以下维度对项目进行分组：

- **按领域**：工作、个人、学习、健康
- **按时间**：短期、中期、长期
- **按优先级**：P0、P1、P2
- **按状态**：活跃、暂停、归档

![项目分组示例](./images/project-groups.png)

### 2. 任务标记规范

为了获得最佳的 AI 查询效果，建议统一任务标记格式：

```markdown
## 项目名称
> 项目描述

任务名称 #任务 @L1
具体工作项 @2026-03-05
另一个工作项 @2026-03-06 09:00:00~12:00:00 #done

子任务 #任务 @L2
子任务工作项 @2026-03-07
```

**标记说明：**
- `#任务` - 标记任务行
- `@L1/@L2/@L3` - 任务层级
- `@YYYY-MM-DD` - 事项日期
- `@YYYY-MM-DD HH:mm:ss~HH:mm:ss` - 带时间范围
- `#done` / `#已完成` - 标记已完成
- `#abandoned` / `#已放弃` - 标记已放弃

### 3. 与 AI 对话的技巧

#### 明确时间范围

✅ **好的提问：**
- "这周有哪些待办任务？"
- "下个月要完成什么？"
- "2026年第一季度有哪些项目？"

❌ **模糊的提问：**
- "我有什么任务？"
- "接下来要做什么？"

#### 指定项目或分组

✅ **好的提问：**
- "工作分组下有哪些项目？"
- "项目 A 还剩多少任务没完成？"
- "个人学习分组本周的进度如何？"

#### 组合筛选条件

✅ **好的提问：**
- "工作项目中，本周待办的任务有哪些？"
- "上个月已完成的事项中，属于项目 A 的有哪些？"

### 4. 隐私与安全

- MCP 服务器只在本地运行，数据不会上传到云端
- AI 助手通过本地进程访问数据，无需网络传输
- 建议不要在任务内容中记录敏感信息（如密码、密钥等）

---

## 常见问题

### Q1: MCP 服务器启动失败怎么办？

**检查清单：**
1. 确认已运行 `npm run build` 或 `npm run build:mcp` 生成 `mcp-server.js`
2. 检查 `VAULT_PATH` 环境变量是否正确设置
3. 确认 Node.js 版本 >= 18
4. 查看 AI 助手的 MCP 日志获取详细错误信息

![故障排查](./images/troubleshooting.png)

### Q2: AI 助手无法读取数据？

**可能原因：**
1. 项目目录未正确配置 - 检查插件设置中的目录路径
2. 文件格式不正确 - 确保使用标准的子弹笔记格式
3. 任务标签不匹配 - 检查 `TASK_TAGS` 环境变量

### Q3: 数据更新后 AI 看不到最新内容？

**解决方案：**
1. 在 Obsidian 中保存文件后，等待 1-2 秒让文件系统同步
2. 重新发起对话，AI 会重新查询最新数据
3. 如果问题持续，尝试重启 AI 助手

### Q4: 支持哪些 AI 助手？

目前已测试支持的 AI 助手：

- ✅ Cursor（推荐）
- ✅ Claude Desktop
- ✅ Windsurf
- ✅ Continue（VS Code 插件）

其他支持 MCP 协议的 AI 助手理论上也可以使用。

![支持的 AI 助手](./images/supported-ai-assistants.png)

### Q5: 如何调试 MCP 连接？

**启用调试模式：**

在配置中添加日志输出：

```json
{
  "mcpServers": {
    "obsidian-bullet-journal-assistant": {
      "command": "node",
      "args": ["--inspect", "/path/to/mcp-server.js"],
      "env": {
        "VAULT_PATH": "/path/to/vault",
        "DEBUG": "true"
      }
    }
  }
}
```

然后在终端查看日志输出。

---

## 结语

MCP 功能的加入，让子弹笔记插件从单纯的数据记录工具，升级为智能化的任务管理助手。通过与 AI 的深度融合，你可以：

- 📊 快速获取数据洞察
- 🤖 获得智能工作建议
- ⏰ 优化时间管理和规划
- 📝 自动生成工作报告

**立即体验：**
1. 更新到最新版本插件
2. 按本文指南配置 MCP
3. 开始向 AI 助手提问！

---

## 相关资源

- **GitHub 仓库**：[obsidian-plugin-bullet-journal](https://github.com/your-repo)
- **问题反馈**：[GitHub Issues](https://github.com/your-repo/issues)
- **使用文档**：[完整文档](./user-guide.md)
- **更新日志**：[CHANGELOG](../CHANGELOG.md)

---

*本文档最后更新于 2026-03-05*
