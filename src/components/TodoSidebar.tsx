import React, { useState, useEffect, useCallback } from 'react';
import { Item } from '../models/types';
import { MarkdownParser } from '../parser/markdownParser';
import { usePlugin } from '../context/PluginContext';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import { CALENDAR_VIEW_TYPE } from '../views/CalendarView';
import { openFileAtLine } from '../utils/fileUtils';
import { GroupSelect } from './shared';
import { formatDateLabel, formatTimeRange, getTodayISO } from '../utils/dateUtils';

interface GroupedItems {
  [date: string]: Item[];
}

interface TodoSidebarProps {
  onItemClick?: (item: Item) => void;
}

export const TodoSidebar: React.FC<TodoSidebarProps> = ({ onItemClick }) => {
  const pluginContext = usePlugin();
  const app = useApp();
  const plugin = pluginContext?.plugin;
  const selectedGroup = pluginContext?.selectedGroup ?? '';
  const setSelectedGroup = pluginContext?.setSelectedGroup;
  const availableGroups = pluginContext?.availableGroups ?? [];
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(() => {
    if (!pluginContext?.plugin?.settings) {
      setGroupedItems({});
      setLoading(false);
      return;
    }

    const projectDirectories = pluginContext.plugin.settings.projectDirectories
      .filter(dir => dir.enabled && dir.path)
      .map(dir => dir.path);

    if (projectDirectories.length === 0) {
      setGroupedItems({});
      setLoading(false);
      return;
    }

    const dirConfigs = pluginContext.plugin.settings.projectDirectories
      .filter(dir => dir.enabled && dir.path)
      .map(dir => ({ path: dir.path, groupId: dir.groupId }));

    const parser = new MarkdownParser(projectDirectories, dirConfigs);
    const allItems = parser.getAllItems();

    // Filter items by selected group
    const filteredItems = selectedGroup
      ? allItems.filter(item => {
          return item.project?.groupId === selectedGroup;
        })
      : allItems;

    // Get today's date string
    const todayStr = getTodayISO();

    // Filter items >= today
    const futureItems = filteredItems.filter(item => item.date >= todayStr);

    // Group by date using Map for type safety
    const grouped = new Map<string, Item[]>();
    futureItems.forEach(item => {
      const items = grouped.get(item.date);
      if (items) {
        items.push(item);
      } else {
        grouped.set(item.date, [item]);
      }
    });

    // Sort items within each date by time
    grouped.forEach(items => {
      items.sort((a, b) => {
        return (a.startDateTime || a.date).localeCompare(b.startDateTime || b.date);
      });
    });

    // Convert Map to object
    const groupedObj: GroupedItems = Object.fromEntries(grouped);
    setGroupedItems(groupedObj);
    setLoading(false);
  }, [pluginContext, selectedGroup, plugin]);

  useEffect(() => {
    loadItems();

    if (!pluginContext?.plugin) {
      return;
    }

    // Register refresh callback
    const unsubscribe = pluginContext.plugin.onRefresh(() => {
      loadItems();
    });

    return () => {
      unsubscribe();
    };
  }, [loadItems, pluginContext]);

  const handleItemClick = async (item: Item) => {
    if (!app || !item.project?.filePath) return;

    await openFileAtLine(app, item.project.filePath, item.lineNumber);

    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleOpenModal = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (app && pluginContext?.plugin) {
      const modal = new EventDetailsModal(app, {
        title: item.task?.name || item.content,
        start: item.startDateTime || item.date,
        end: item.endDateTime,
        allDay: !item.startDateTime,
        project: item.project?.name,
        projectLinks: item.project?.links,
        task: item.task?.name,
        taskLinks: item.task?.links,
        level: item.task?.level,
        item: item.content,
        hasItems: true,
        filePath: item.project?.filePath,
        lineNumber: item.lineNumber,
      }, pluginContext.plugin);
      modal.open();
    }
  };

  const handleOpenCalendar = async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app) return;

    // Extract date
    const dateStr = item.date;

    // Find or create calendar view
    let leaf = app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = app.workspace.getLeaf(false);
      await leaf.setViewState({ type: CALENDAR_VIEW_TYPE });
    }

    // Activate view
    app.workspace.revealLeaf(leaf);

    // Get calendar instance and navigate to date
    const view = leaf.view as any;
    if (view?.componentRef?.current) {
      const calendarInstance = view.componentRef.current.getCalendarInstance();
      if (calendarInstance) {
        calendarInstance.gotoDate(dateStr);
        calendarInstance.changeView('timeGridDay');
      }
    }
  };

  const sortedDates = Object.keys(groupedItems).sort();

  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedGroup) {
      setSelectedGroup(e.target.value);
    }
  }, [setSelectedGroup]);

  const todoTexts = t('todoSidebar');

  if (loading) {
    return (
      <div className="hk-work-todo-sidebar">
        <div className="hk-work-todo-loading">{t('common').loading}</div>
      </div>
    );
  }

  if (sortedDates.length === 0) {
    return (
      <div className="hk-work-todo-sidebar">
        <div className="hk-work-todo-empty">{todoTexts.noTodos}</div>
      </div>
    );
  }

  return (
    <div className="hk-work-todo-sidebar">
      <div className="hk-work-todo-header">
        <h3>{todoTexts.title}</h3>
        <GroupSelect
          groups={availableGroups}
          value={selectedGroup}
          onChange={handleGroupChange}
        />
      </div>
      <div className="hk-work-todo-content">
        {sortedDates.map(date => (
          <div key={date} className="hk-work-todo-date-group">
            <div className="hk-work-todo-timeline">
              <div className="hk-work-todo-timeline-line"></div>
              <div className="hk-work-todo-timeline-dot"></div>
            </div>
            <div className="hk-work-todo-date-content">
              <div className="hk-work-todo-date-header">
                {formatDateLabel(date, todoTexts.today, todoTexts.tomorrow)}
              </div>
              <div className="hk-work-todo-items">
              {groupedItems[date].map((item, index) => (
                <div
                  key={`${date}-${index}`}
                  className="hk-work-todo-item"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="hk-work-todo-item-content">
                    <div className="hk-work-todo-item-header">
                      <span className="hk-work-todo-item-time">
                        {formatTimeRange(item.startDateTime, item.endDateTime) || todoTexts.allDay}
                      </span>
                      <span className="hk-work-todo-item-project">
                        {item.project?.name}
                      </span>
                    </div>
                    <div className="hk-work-todo-item-task">
                      {item.task?.name}
                    </div>
                    <div className="hk-work-todo-item-text">
                      {item.content}
                    </div>
                  </div>
                  <div className="hk-work-todo-item-actions">
                    <button
                      className="hk-work-todo-action-btn"
                      onClick={(e) => handleOpenModal(item, e)}
                      title="查看详情"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                    </button>
                    <button
                      className="hk-work-todo-action-btn"
                      onClick={(e) => handleOpenCalendar(item, e)}
                      title="打开日历"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
