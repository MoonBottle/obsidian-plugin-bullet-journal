import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Notice } from 'obsidian';
import { gantt } from 'dhtmlx-gantt';
// CSS imported via styles.css concatenation
import { usePlugin } from '../context/PluginContext';
import { useApp } from '../context/AppContext';
import { MarkdownParser } from '../parser/markdownParser';
import { Project, Task } from '../models/types';
import { t } from '../i18n';
import { GroupSelect } from './shared/GroupSelect';
import { RefreshButton } from './shared/RefreshButton';
import { ViewHeader } from './shared/ViewHeader';
import { toISODateString } from '../utils/dateUtils';

// Style constants
const DATE_INPUT_STYLE: React.CSSProperties = {
  fontSize: '12px',
  padding: '4px 24px 4px 8px',
  border: '1px solid var(--background-modifier-border)',
  borderRadius: '4px',
  backgroundColor: 'var(--background-primary)',
  color: 'var(--text-normal)',
  position: 'relative'
};

// Define the DHTMLX Gantt types
interface GanttData {
  id: string | number;
  text: string;
  start_date?: Date;
  end_date?: Date;
  parent?: string | number;
  type?: string;
  progress?: number;
  open?: boolean;
}

// Pure functions extracted outside component
const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toISODateString(date);
};

const getDefaultEndDate = (): string => {
  return toISODateString(new Date());
};

export const GanttViewComponent = () => {
  const pluginContext = usePlugin();
  const app = useApp();
  const plugin = pluginContext?.plugin;
  const refreshKey = pluginContext?.refreshKey ?? 0;
  const refresh = pluginContext?.refresh;
  const selectedGroup = pluginContext?.selectedGroup ?? '';
  const setSelectedGroup = pluginContext?.setSelectedGroup;
  const availableGroups = pluginContext?.availableGroups ?? [];

  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [isLoading, setIsLoading] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [projectsData, setProjectsData] = useState<Project[]>([]);

  // Filter projects by selected group
  const filteredProjects = useMemo(() => {
    if (!selectedGroup) return projectsData;
    return projectsData.filter(project => project.groupId === selectedGroup);
  }, [projectsData, selectedGroup]);

  // Date filter state - lazy initialization
  const [startDateFilter, setStartDateFilter] = useState<string>(getDefaultStartDate);
  const [endDateFilter, setEndDateFilter] = useState<string>(getDefaultEndDate);

  // Calculate task dates based on items
  const calculateTaskDates = (task: Task): { start: Date | undefined, end: Date | undefined } => {
    // Task dates are determined by its items, not by the task line itself
    if (task.items && task.items.length > 0) {
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      task.items.forEach(item => {
        const itemStart = item.startDateTime || item.date;
        const itemEnd = item.endDateTime || item.startDateTime || item.date;

        if (itemStart) {
          const d = new Date(itemStart);
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
        if (itemEnd) {
          const d = new Date(itemEnd);
          if (!maxDate || d > maxDate) maxDate = d;
          if (!minDate || d < minDate) minDate = d;
        }
      });

      if (minDate && maxDate) {
         if (minDate.getTime() === maxDate!.getTime()) {
             const adjustedMax = new Date(maxDate!);
             adjustedMax.setHours(23, 59, 59, 999);
             return { start: minDate, end: adjustedMax };
         }
        return { start: minDate, end: maxDate };
      }
    }

    // Fallback: no items
    return { start: undefined, end: undefined };
  };

  // Check if a task falls within the date filter range
  const isTaskInDateRange = useCallback((task: Task): boolean => {
    if (!startDateFilter && !endDateFilter) return true;

    const { start, end } = calculateTaskDates(task);
    if (!start || !end) return true; // Include tasks without dates

    const filterStart = startDateFilter ? new Date(startDateFilter) : null;
    const filterEnd = endDateFilter ? new Date(endDateFilter) : null;

    // Set filter end to end of day
    if (filterEnd) {
      filterEnd.setHours(23, 59, 59, 999);
    }

    // Task is in range if:
    // - Task starts before filter end AND task ends after filter start
    const taskStartInRange = !filterEnd || start <= filterEnd;
    const taskEndInRange = !filterStart || end >= filterStart;

    return taskStartInRange && taskEndInRange;
  }, [startDateFilter, endDateFilter]);

  // Transform data to DHTMLX format
  const transformData = useCallback((projects: Project[], showItems: boolean): GanttData[] => {
    const data: GanttData[] = [];

    // Use filtered projects if a group is selected
    const projectsToRender = selectedGroup ? filteredProjects : projects;

    projectsToRender.forEach((project, pIndex) => {
      const projectId = `proj-${pIndex}`;

      // Filter tasks by date range
      const filteredTasks = project.tasks.filter(isTaskInDateRange);

      // Only add project if it has visible tasks
      if (filteredTasks.length === 0) return;

      // Add Project Node
      data.push({
        id: projectId,
        text: project.name,
        type: 'project',
        open: true,
        progress: 0
      });

      // Hierarchy tracking
      let lastL1Id: string | null = null;
      let lastL2Id: string | null = null;

      filteredTasks.forEach((task, tIndex) => {
        const taskId = `task-${pIndex}-${tIndex}`;
        let parentId = projectId;

        // Determine Hierarchy
        if (task.level === 'L1') {
          parentId = projectId;
          lastL1Id = taskId;
          lastL2Id = null; // Reset L2 when new L1 starts
        } else if (task.level === 'L2') {
          parentId = lastL1Id || projectId; // Fallback to project if no L1
          lastL2Id = taskId;
        } else if (task.level === 'L3') {
          parentId = lastL2Id || lastL1Id || projectId;
        }

        const { start, end } = calculateTaskDates(task);

        data.push({
          id: taskId,
          text: task.name,
          start_date: start,
          end_date: end,
          parent: parentId,
          type: 'task', // Use standard task bar
          open: true,
          progress: 0 // Could calculate from items completion
        });

        // Add Items if enabled
        if (showItems && task.items && task.items.length > 0) {
          task.items.forEach((item, iIndex) => {
            const itemStart = item.startDateTime || item.date;
            const itemEnd = item.endDateTime || item.startDateTime || item.date;

            if (itemStart) {
               let start = new Date(itemStart);
               let end = itemEnd ? new Date(itemEnd) : new Date(itemStart);

               if (start.getTime() === end.getTime()) {
                 end = new Date(start);
                 end.setHours(23, 59, 59, 999);
               }

               data.push({
                id: `item-${pIndex}-${tIndex}-${iIndex}`,
                text: item.content,
                start_date: start,
                end_date: end,
                parent: taskId,
                type: 'task', // Item is also a task bar
                progress: 0
              });
            }
          });
        }
      });
    });

    return data;
  }, [isTaskInDateRange, selectedGroup, filteredProjects]);

  const loadData = useCallback(async () => {
    if (!plugin) return;
    setIsLoading(true);
    try {
      const dirConfigs: { path: string; groupId?: string }[] = [];
      for (const d of plugin.settings.projectDirectories) {
        if (d.enabled && d.path) {
          dirConfigs.push({ path: d.path, groupId: d.groupId });
        }
      }
      const enabledDirs = dirConfigs.map(d => d.path);

      if (enabledDirs.length === 0) {
        new Notice(t('config').setDirectory);
        return;
      }
      const vault = app?.vault;
      const parser = new MarkdownParser(enabledDirs, dirConfigs, vault);
      const projects = await parser.parseAllProjects();
      setProjectsData(projects);
    } catch (error) {
      console.error('Error loading data:', error);
      new Notice('Error loading data');
    } finally {
      setIsLoading(false);
    }
  }, [plugin, app]);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Configure Scale based on mode
  const configureScale = useCallback((mode: 'Day' | 'Week' | 'Month') => {
    switch (mode) {
      case 'Day':
        gantt.config.scales = [
          { unit: "day", step: 1, format: "%d %M" }
        ];
        gantt.config.scale_height = 27;
        break;
      case 'Week':
        gantt.config.scales = [
          { unit: "week", step: 1, format: "Week #%W" },
          { unit: "day", step: 1, format: "%D" }
        ];
        gantt.config.scale_height = 50;
        break;
      case 'Month':
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F, %Y" },
          { unit: "week", step: 1, format: "#%W" }
        ];
        gantt.config.scale_height = 50;
        break;
    }
  }, []);

  // Initialize Gantt
  useEffect(() => {
    if (!ganttContainerRef.current) return;

    const ganttTexts = t('gantt');

    // Config
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.xml_date = "%Y-%m-%d %H:%i"; // Parse format
    gantt.config.columns = [
      { name: "text", label: ganttTexts.taskName, width: "*", tree: true },
      { name: "start_date", label: ganttTexts.startTime, align: "center", width: 100 },
      { name: "end_date", label: ganttTexts.endTime, align: "center", width: 100 }
    ];
    gantt.config.open_tree_initially = true;

    // Improve task bar text readability - Calendar-like style
    gantt.templates.task_text = function(start, end, task) {
      return `<span style="
        color: var(--text-normal);
        font-weight: 500;
        font-size: 12px;
        padding: 2px 6px;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${task.text}</span>`;
    };

    // Calendar-like task bar styling
    gantt.templates.task_class = function(start, end, task) {
      return 'calendar-style-task';
    };

    // Customize task bar appearance
    gantt.config.bar_height = 28;
    gantt.config.row_height = 36;

    // Disable drag and resize handles
    gantt.config.drag_resize = false;
    gantt.config.drag_move = false;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;

    // Localization
    gantt.i18n.setLocale("cn");

    // Apply initial scale config BEFORE init
    configureScale(viewMode);

    gantt.init(ganttContainerRef.current);

    return () => {
      gantt.clearAll();
    };
  }, []); // Run only once on mount

  // Update Data and View
  useEffect(() => {
    gantt.clearAll();
    const formattedData = transformData(projectsData, showItems);
    gantt.parse({ data: formattedData });
  }, [projectsData, showItems, transformData, startDateFilter, endDateFilter]);

  // Update Scale when viewMode changes
  useEffect(() => {
    configureScale(viewMode);
    gantt.render();
  }, [viewMode, configureScale]);

  const handleRefresh = useCallback(() => {
    if (refresh) {
      refresh();
    }
  }, [refresh]);

  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedGroup) {
      setSelectedGroup(e.target.value);
    }
  }, [setSelectedGroup]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDateFilter(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDateFilter(e.target.value);
  }, []);

  const handleShowItemsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowItems(e.target.checked);
  }, []);

  const ganttTexts = t('gantt');

  return (
    <div className="bullet-journal-container">
      <ViewHeader
        title={ganttTexts.title}
        actions={
          <div className="view-mode-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Group Filter */}
            <GroupSelect
              groups={availableGroups}
              value={selectedGroup}
              onChange={handleGroupChange}
              style={{ marginRight: '12px' }}
            />

            {/* Date Filter */}
            <div className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ganttTexts.timeFilter}:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={handleStartDateChange}
                style={DATE_INPUT_STYLE}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ganttTexts.to}</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={handleEndDateChange}
                style={DATE_INPUT_STYLE}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '8px', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={showItems}
                onChange={handleShowItemsChange}
                style={{ marginRight: '4px' }}
              />
              {ganttTexts.showItems}
            </label>

            <button
              className={`bullet-journal-refresh-btn ${viewMode === 'Day' ? 'active' : ''}`}
              onClick={() => setViewMode('Day')}
              style={{ backgroundColor: viewMode === 'Day' ? 'var(--interactive-accent)' : '', color: viewMode === 'Day' ? 'white' : '' }}
            >
              {ganttTexts.day}
            </button>
            <button
              className={`bullet-journal-refresh-btn ${viewMode === 'Week' ? 'active' : ''}`}
              onClick={() => setViewMode('Week')}
              style={{ backgroundColor: viewMode === 'Week' ? 'var(--interactive-accent)' : '', color: viewMode === 'Week' ? 'white' : '' }}
            >
              {ganttTexts.week}
            </button>
            <button
              className={`bullet-journal-refresh-btn ${viewMode === 'Month' ? 'active' : ''}`}
              onClick={() => setViewMode('Month')}
              style={{ backgroundColor: viewMode === 'Month' ? 'var(--interactive-accent)' : '', color: viewMode === 'Month' ? 'white' : '' }}
            >
              {ganttTexts.month}
            </button>

            <RefreshButton
              onClick={handleRefresh}
              isLoading={isLoading}
              text={t('common').refresh}
              title={ganttTexts.refreshData}
            />
          </div>
        }
      />
      <div className="gantt-container" style={{ height: 'calc(100vh - 100px)', width: '100%', position: 'relative' }}>
        <div ref={ganttContainerRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
    </div>
  );
};
