# Bullet Journal Obsidian Plugin

[中文](README.zh.md) | English

An Obsidian plugin for visualizing Bullet Journal project tasks with calendar and Gantt chart views.

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
3. **Default View**: Set the default view to open

## Usage

### Opening Views
- **Command Palette**: Use Obsidian's command palette to open different views
- **Ribbon Icon**: Click the calendar icon in the ribbon to open the default view
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

## License

AGPL-3.0
