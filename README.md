# Bullet Journal Assistant Obsidian Plugin

[中文](README.zh.md) | English

An Obsidian assistant plugin for visualizing Bullet Journal project tasks with calendar and Gantt chart views.

## Features

### Project Management
- **Project List**: Display all projects and their basic information
- **Project Details**: View detailed project information and related materials
- **Project Filtering**: Filter projects by name, status, etc.

### Task Management
- **Task List**: Display all tasks under a project
- **Task Details**: View task details, links, and related items
- **Task Hierarchy**: Visualize task hierarchy relationships (@L1, @L2, @L3)

### Item Management
- **Item List**: Display all items and their associated tasks and projects
- **Item Details**: View item descriptions and dates
- **Item Filtering**: Filter items by date, project, task, etc.

### Calendar View
- **Day/Week/Month View**: Display daily work items in calendar format
- **Item Marking**: Mark work items on the calendar
- **Interactive Features**: Click dates to view detailed items

### Gantt Chart View
- **Project Gantt Chart**: Display project timeline and task progress
- **Task Dependencies**: Visualize task dependency relationships
- **Time Range Selection**: Support viewing Gantt charts for different time ranges
- **Progress Tracking**: Mark task completion status and progress

## Installation

1. **Manual Installation**:
   - Download the latest release from the GitHub repository
   - Extract the files to your Obsidian plugins directory
   - Reload Obsidian
   - Enable the plugin in Obsidian settings

2. **From Obsidian Plugin Market**:
   - Open Obsidian settings
   - Navigate to "Community Plugins"
   - Search for "Bullet Journal"
   - Click "Install" and then "Enable"

## Configuration

1. **Data Directory**: Set the path to your Bullet Journal data directory
2. **Default Year**: Set the default year to display

## Usage

### Opening Views
- **Command Palette**: Use Obsidian's command palette to open different views
- **Ribbon Icon**: Click the calendar icon in the ribbon to open a menu (Calendar, Gantt, or Project view)
- **Keyboard Shortcuts**: Assign keyboard shortcuts to open views quickly

### Navigating Views
- **Project View**: Click on projects to view their tasks and details
- **Calendar View**: Use the calendar controls to navigate between dates
- **Gantt View**: Use the timeline controls to navigate between time ranges

### Interacting with Items
- **Task Items**: Click on task items to view their details and related items
- **Calendar Items**: Click on calendar items to view their details
- **Gantt Items**: Click on Gantt chart items to view their details

## Data Format

The plugin expects Bullet Journal data to be in the following format:

```markdown
## [Project Name]
> [Project Description]
> [Material Name]: [Link]

### 工作任务
[Task Name] #任务
[Task Link](https://example.com)
[Item 1] @[Date]
[Item 2] @[Date]

[Task Name 2] #任务
[Task Link](https://example.com)
[Item 1] @[Date]

[Task Name 3] #任务 @L1
[Item 1] @[Date]
```

### Task Hierarchy Markers
- `@L1` - Parent task (level 1)
- `@L2` - Child task (level 2)
- `@L3` - Grandchild task (level 3)

## Development

### Prerequisites
- Node.js
- npm
- Obsidian

### Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Create a symbolic link to the plugin directory in your Obsidian plugins directory

### Building
Run `npm run build` to build the plugin for production

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## MCP Integration

This plugin provides an MCP (Model Context Protocol) server that allows AI assistants like Cursor, Claude, and Windsurf to access your bullet journal data.

### Available Tools

| Tool | Description |
|------|-------------|
| `list_groups` | Query all configured project groups |
| `list_projects` | Query all projects with optional group filter |
| `filter_items` | Filter bullet journal items by project, date range, group, or status |

### Setup

1. Run `npm run build` or `npm run build:mcp` to generate `mcp-server.js`
2. Open Obsidian Settings → Bullet Journal → MCP Configuration
3. Click "Copy MCP Config" to copy the configuration to clipboard
4. Paste the configuration into your AI assistant's MCP settings file

### AI Agent Prompt

When using this MCP server with AI assistants, you can use the following prompt to help the AI understand how to work with your bullet journal data:

```
You have access to a bullet journal MCP server with the following tools:

1. **list_groups**: Lists all project groups. Use this first to understand the project organization.
2. **list_projects**: Lists all projects with optional groupId filter. Each project has id, name, description, path, groupId, and taskCount.
3. **filter_items**: Filters bullet journal items with parameters:
   - projectId/projectIds: Filter by specific project(s)
   - groupId: Filter by project group
   - startDate/endDate: Filter by date range (YYYY-MM-DD format)
   - status: Filter by status ('pending', 'completed', 'abandoned')

**When to use these tools:**
- When the user asks about their tasks, projects, or schedule
- When the user wants to track progress or review completed work
- When the user needs to plan or organize their work
- When the user asks for summaries or reports of their bullet journal data

**Best practices:**
1. Always start with `list_groups` to understand the project structure
2. Use `list_projects` to get an overview of all projects
3. Use `filter_items` with appropriate filters to get specific task items
4. Combine filters for more precise queries (e.g., pending items in a specific project for this week)

**Example workflows:**
- "What tasks do I have pending this week?" → filter_items with startDate, endDate, and status='pending'
- "Show me all projects in the Work group" → list_groups → list_projects with groupId
- "What did I complete last month?" → filter_items with date range and status='completed'
```

## License

AGPL-3.0
