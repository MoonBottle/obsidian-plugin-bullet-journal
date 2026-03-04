import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Item } from '../models/types';
import { usePlugin } from '../context/PluginContext';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import { DatePickerModal } from '../modals/DatePickerModal';
import { CALENDAR_VIEW_TYPE } from '../views/CalendarView';
import { openFileAtLine, updateItemDate, updateItemStatus, getTomorrowDate, getTodayDate } from '../utils/fileUtils';
import { GroupSelect } from './shared/GroupSelect';
import { formatDateLabel, formatTimeRange, getTodayISO } from '../utils/dateUtils';
import { showItemContextMenu } from '../utils/contextMenu';
import { Menu, MenuItem, Notice } from 'obsidian';

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
  const [todayItems, setTodayItems] = useState<Item[]>([]);
  const [tomorrowItems, setTomorrowItems] = useState<Item[]>([]);
  const [completedItems, setCompletedItems] = useState<Item[]>([]);
  const [abandonedItems, setAbandonedItems] = useState<Item[]>([]);
  const [expiredItems, setExpiredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState({
    expired: false,
    today: false,
    tomorrow: false,
    future: false,
    completed: false,
    abandoned: false
  });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideAbandoned, setHideAbandoned] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // 从插件设置读取初始状态
  useEffect(() => {
    if (plugin?.settings?.todoDock) {
      setHideCompleted(plugin.settings.todoDock.hideCompleted);
      setHideAbandoned(plugin.settings.todoDock.hideAbandoned);
    }
  }, [plugin]);

  const loadItems = useCallback(async () => {
    if (!plugin?.settings) {
      setGroupedItems({});
      setTodayItems([]);
      setTomorrowItems([]);
      setCompletedItems([]);
      setAbandonedItems([]);
      setExpiredItems([]);
      setLoading(false);
      return;
    }

    const projectDirectories = plugin.settings.projectDirectories
      .filter(d => d.enabled && d.path)
      .map(d => d.path);

    if (projectDirectories.length === 0) {
      setGroupedItems({});
      setTodayItems([]);
      setTomorrowItems([]);
      setCompletedItems([]);
      setAbandonedItems([]);
      setExpiredItems([]);
      setLoading(false);
      return;
    }

    const allItems = await plugin.getCachedItems();

    const filteredItems = selectedGroup
      ? allItems.filter(item => item.project?.groupId === selectedGroup)
      : allItems;

    const pendingItems = filteredItems.filter(item => item.status === 'pending');
    const completed = filteredItems.filter(item => item.status === 'completed');
    const abandoned = filteredItems.filter(item => item.status === 'abandoned');
    const todayStr = getTodayISO();
    const tomorrowDate = getTomorrowDate();
    const expired = pendingItems.filter(item => item.date < todayStr);
    const today = pendingItems.filter(item => item.date === todayStr);
    const tomorrow = pendingItems.filter(item => item.date === tomorrowDate);
    const futureItems = pendingItems.filter(item => item.date > tomorrowDate);

    const grouped = new Map<string, Item[]>();
    
    futureItems.forEach(item => {
      const items = grouped.get(item.date);
      if (items) {
        items.push(item);
      } else {
        grouped.set(item.date, [item]);
      }
    });

    grouped.forEach(items => {
      items.sort((a, b) => {
        return (a.startDateTime || a.date).localeCompare(b.startDateTime || b.date);
      });
    });

    const groupedObj: GroupedItems = Object.fromEntries(grouped);
    setGroupedItems(groupedObj);
    setTodayItems(today);
    setTomorrowItems(tomorrow);
    setCompletedItems(completed);
    setAbandonedItems(abandoned);
    setExpiredItems(expired);
    setLoading(false);
  }, [plugin, selectedGroup]);

  // Load from cache on mount and when refreshKey changes (unified refresh path)
  useEffect(() => {
    loadItems();
  }, [loadItems, pluginContext?.refreshKey ?? 0]);

  const handleItemClick = useCallback(async (item: Item) => {
    if (!app || !item.project?.filePath) return;

    await openFileAtLine(app, item.project.filePath, item.lineNumber);

    if (onItemClick) {
      onItemClick(item);
    }
  }, [app, onItemClick]);

  const handleOpenModal = useCallback((item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (app && plugin) {
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
        itemLinks: item.links,
        hasItems: true,
        filePath: item.project?.filePath,
        lineNumber: item.lineNumber,
      }, plugin);
      modal.open();
    }
  }, [app, plugin]);

  const handleOpenCalendar = useCallback(async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app) return;

    const dateStr = item.date;

    let leaf = app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = app.workspace.getLeaf(false);
      await leaf.setViewState({ type: CALENDAR_VIEW_TYPE });
    }

    app.workspace.revealLeaf(leaf);

    const view = leaf.view as any;
    if (view?.componentRef?.current) {
      const calendarInstance = view.componentRef.current.getCalendarInstance();
      if (calendarInstance) {
        calendarInstance.gotoDate(dateStr);
        calendarInstance.changeView('timeGridDay');
      }
    }
  }, [app]);

  const handleDone = useCallback(async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app || !item.project?.filePath || !item.lineNumber) return;

    const success = await updateItemStatus(app, item.project.filePath, item.lineNumber, 'completed');
    if (success && plugin) {
      await plugin.refreshDataNow();
    }
  }, [app, plugin]);

  const handleMigrate = useCallback(async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app || !item.project?.filePath || !item.lineNumber) return;

    const tomorrowDate = getTomorrowDate();
    const timeMatch = item.startDateTime?.match(/(\d{2}:\d{2})/);
    const newTime = timeMatch ? timeMatch[1] : undefined;

    const success = await updateItemDate(app, item.project.filePath, item.lineNumber, tomorrowDate, newTime);
    if (success && plugin) {
      await plugin.refreshDataNow();
    }
  }, [app, plugin]);

  const handleMigrateToday = useCallback(async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app || !item.project?.filePath || !item.lineNumber) return;

    const todayDate = getTodayDate();
    const timeMatch = item.startDateTime?.match(/(\d{2}:\d{2})/);
    const newTime = timeMatch ? timeMatch[1] : undefined;

    const success = await updateItemDate(app, item.project.filePath, item.lineNumber, todayDate, newTime);
    if (success && plugin) {
      await plugin.refreshDataNow();
    }
  }, [app, plugin]);

  const handleAbandon = useCallback(async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!app || !item.project?.filePath || !item.lineNumber) return;

    const success = await updateItemStatus(app, item.project.filePath, item.lineNumber, 'abandoned');
    if (success && plugin) {
      await plugin.refreshDataNow();
    }
  }, [app, plugin]);

  const handleMigrateCustom = useCallback((item: Item) => {
    if (!app) return;
    
    const modal = new DatePickerModal(app, '选择迁移日期', item.date, async (newDate: string) => {
      if (!item.project?.filePath || !item.lineNumber) return;
      
      const timeMatch = item.startDateTime?.match(/(\d{2}:\d{2})/);
      const newTime = timeMatch ? timeMatch[1] : undefined;
      
      const success = await updateItemDate(app, item.project.filePath, item.lineNumber, newDate, newTime);
      if (success) {
        loadItems();
      }
    });
    modal.open();
  }, [app, loadItems]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    e.stopPropagation();
    
    showItemContextMenu(e, item, {
      onComplete: async () => {
        if (!app || !item.project?.filePath || !item.lineNumber) return;
        const success = await updateItemStatus(app, item.project.filePath, item.lineNumber, 'completed');
        if (success) loadItems();
      },
      onMigrateToday: async () => {
        if (!app || !item.project?.filePath || !item.lineNumber) return;
        const todayDate = getTodayDate();
        const timeMatch = item.startDateTime?.match(/(\d{2}:\d{2})/);
        const newTime = timeMatch ? timeMatch[1] : undefined;
        const success = await updateItemDate(app, item.project.filePath, item.lineNumber, todayDate, newTime);
        if (success) loadItems();
      },
      onMigrateTomorrow: async () => {
        if (!app || !item.project?.filePath || !item.lineNumber) return;
        const tomorrowDate = getTomorrowDate();
        const timeMatch = item.startDateTime?.match(/(\d{2}:\d{2})/);
        const newTime = timeMatch ? timeMatch[1] : undefined;
        const success = await updateItemDate(app, item.project.filePath, item.lineNumber, tomorrowDate, newTime);
        if (success) loadItems();
      },
      onMigrateCustom: () => handleMigrateCustom(item),
      onAbandon: async () => {
        if (!app || !item.project?.filePath || !item.lineNumber) return;
        const success = await updateItemStatus(app, item.project.filePath, item.lineNumber, 'abandoned');
        if (success) loadItems();
      },
      onOpenDoc: () => handleItemClick(item),
      onShowDetail: () => {
        if (app && plugin) {
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
            itemLinks: item.links,
            hasItems: true,
            filePath: item.project?.filePath,
            lineNumber: item.lineNumber,
          }, plugin);
          modal.open();
        }
      },
      onShowCalendar: () => {
        if (!app) return;
        const dateStr = item.date;
        app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE).forEach(async (leaf) => {
          app.workspace.revealLeaf(leaf);
          const view = leaf.view as any;
          if (view?.componentRef?.current) {
            const calendarInstance = view.componentRef.current.getCalendarInstance();
            if (calendarInstance) {
              calendarInstance.gotoDate(dateStr);
              calendarInstance.changeView('timeGridDay');
            }
          }
        });
      }
    });
  }, [app, plugin, loadItems, handleItemClick, handleMigrateCustom]);

  const toggleSection = useCallback((section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleMoreClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const menu = new Menu();
    const moreMenuTexts = t('moreMenu');

    // 刷新选项
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(moreMenuTexts.refresh)
        .setIcon('refresh-cw')
        .onClick(() => {
          loadItems();
          new Notice(t('common').dataRefreshed);
        });
    });

    // 分隔线
    menu.addSeparator();

    // 隐藏/显示已完成选项
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(hideCompleted ? moreMenuTexts.showCompleted : moreMenuTexts.hideCompleted)
        .setIcon(hideCompleted ? 'eye' : 'eye-off')
        .onClick(() => {
          const newValue = !hideCompleted;
          setHideCompleted(newValue);
          // 持久化到插件设置
          if (plugin) {
            plugin.settings.todoDock.hideCompleted = newValue;
            plugin.saveSettings();
          }
        });
    });

    // 隐藏/显示已放弃选项
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(hideAbandoned ? moreMenuTexts.showAbandoned : moreMenuTexts.hideAbandoned)
        .setIcon(hideAbandoned ? 'eye' : 'eye-off')
        .onClick(() => {
          const newValue = !hideAbandoned;
          setHideAbandoned(newValue);
          // 持久化到插件设置
          if (plugin) {
            plugin.settings.todoDock.hideAbandoned = newValue;
            plugin.saveSettings();
          }
        });
    });

    menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
  }, [plugin, loadItems, hideCompleted, hideAbandoned]);

  const sortedDates = Object.keys(groupedItems).sort();
  const todoTexts = t('todoSidebar') as any;

  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedGroup) {
      setSelectedGroup(e.target.value);
    }
  }, [setSelectedGroup]);

  const renderItem = (item: Item, showActions: boolean = true) => (
    <div
      key={item.id}
      className={`bullet-journal-todo-item ${item.status === 'completed' ? 'status-completed' : ''} ${item.status === 'abandoned' ? 'status-abandoned' : ''}`}
      onClick={() => handleItemClick(item)}
      onContextMenu={(e) => handleContextMenu(e, item)}
    >
      <div className="bullet-journal-todo-item-content">
        <div className="bullet-journal-todo-item-header">
          <span className="bullet-journal-todo-item-time">
            {formatTimeRange(item.startDateTime, item.endDateTime) || todoTexts.allDay}
          </span>
          <span className="bullet-journal-todo-item-project">
            {item.project?.name}
          </span>
        </div>
        <div className="bullet-journal-todo-item-task">
          {item.task?.name}
        </div>
        <div className="bullet-journal-todo-item-text">
          {item.content}
        </div>
      </div>
      {showActions && item.status !== 'completed' && item.status !== 'abandoned' && (
        <div className="bullet-journal-todo-item-actions">
          <button
            className="bullet-journal-todo-action-btn"
            onClick={(e) => handleDone(item, e)}
            title={todoTexts.done}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button
            className="bullet-journal-todo-action-btn"
            onClick={(e) => handleMigrate(item, e)}
            title={todoTexts.migrate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
          <button
            className="bullet-journal-todo-action-btn"
            onClick={(e) => handleAbandon(item, e)}
            title={todoTexts.abandon}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button
            className="bullet-journal-todo-action-btn"
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
            className="bullet-journal-todo-action-btn"
            onClick={(e) => handleOpenCalendar(item, e)}
            title="查看日历"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  const renderSection = (title: string, items: Item[], sectionKey: keyof typeof collapsedSections, showActions: boolean = true) => {
    if (items.length === 0) return null;

    return (
      <div key={sectionKey} className="bullet-journal-todo-section">
        <div className="bullet-journal-todo-section-label clickable" onClick={() => toggleSection(sectionKey)}>
          <span className="bullet-journal-todo-collapse-icon">
            {collapsedSections[sectionKey] ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </span>
          <span>{title} ({items.length})</span>
        </div>
        {!collapsedSections[sectionKey] && (
          <div className="bullet-journal-todo-items">
            {items.map(item => renderItem(item, showActions))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bullet-journal-todo-sidebar">
        <div className="bullet-journal-todo-loading">{t('common').loading}</div>
      </div>
    );
  }

  const hasNoItems = sortedDates.length === 0 && expiredItems.length === 0 && completedItems.length === 0 && abandonedItems.length === 0;

  if (hasNoItems) {
    return (
      <div className="bullet-journal-todo-sidebar">
        <div className="bullet-journal-todo-header">
          <h3>{todoTexts.title}</h3>
          <button
            ref={moreButtonRef}
            className="bullet-journal-todo-more-btn"
            onClick={handleMoreClick}
            title="更多"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
        </div>
        <div className="bullet-journal-todo-body">
          {availableGroups.length > 0 ? (
            <div className="bullet-journal-todo-filter-card">
              <GroupSelect
                groups={availableGroups}
                value={selectedGroup}
                onChange={handleGroupChange}
              />
            </div>
          ) : null}
          <div className="bullet-journal-todo-empty">{todoTexts.noTodos}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bullet-journal-todo-sidebar">
      <div className="bullet-journal-todo-header">
        <h3>{todoTexts.title}</h3>
        <button
          ref={moreButtonRef}
          className="bullet-journal-todo-more-btn"
          onClick={handleMoreClick}
          title="更多"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </div>
      <div className="bullet-journal-todo-body">
        {availableGroups.length > 0 ? (
          <div className="bullet-journal-todo-filter-card">
            <GroupSelect
              groups={availableGroups}
              value={selectedGroup}
              onChange={handleGroupChange}
            />
          </div>
        ) : null}
        <div className="bullet-journal-todo-content">
          {renderSection(todoTexts.expired || '已过期', expiredItems, 'expired')}
          
          {renderSection(todoTexts.today || '今天', todayItems, 'today')}
          
          {renderSection(todoTexts.tomorrow || '明天', tomorrowItems, 'tomorrow')}
          
          {sortedDates.filter(d => d !== getTodayISO() && d !== getTomorrowDate()).map(date => 
            renderSection(formatDateLabel(date, todoTexts.today, todoTexts.tomorrow), groupedItems[date], date as any, true)
          )}
          
          {!hideCompleted && renderSection(todoTexts.completed || '已完成', completedItems, 'completed', false)}
          
          {!hideAbandoned && renderSection(todoTexts.abandoned || '已放弃', abandonedItems, 'abandoned', false)}
        </div>
      </div>
    </div>
  );
};
