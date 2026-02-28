import { useEffect, useRef, useCallback, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Notice, Modal, App } from 'obsidian';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/list';
import timeGridPluginOriginal from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { usePlugin } from '../context/PluginContext';
import { useApp } from '../context/AppContext';
import { MarkdownParser } from '../parser/markdownParser';
import { DataConverter } from '../utils/dataConverter';
import { Item } from '../models/types';
import { EventDetailsModal, EventDetails } from '../modals/EventDetailsModal';
import { DatePickerModal } from '../modals/DatePickerModal';
import { t } from '../i18n';
import { GroupSelect, RefreshButton, ViewHeader } from './shared';
import { showCalendarEventContextMenu } from '../utils/contextMenu';
import { updateItemStatus, updateItemDate, getTomorrowDate, getTodayDate } from '../utils/fileUtils';
import {
  DATE_TIME_RANGE_PATTERN,
  SINGLE_DATE_TIME_PATTERN,
  DATE_ONLY_PATTERN,
  formatDateTimeForMarkdown,
  toISODateString
} from '../utils/dateUtils';

const LIST_VIEW_TYPES = new Set(['listWeek', 'listDay', 'listMonth', 'listYear']);

const isListView = (viewType: string): boolean => LIST_VIEW_TYPES.has(viewType);

class DateDetailsModal extends Modal {
  constructor(app: App, private dateStr: string, private dateItems: Item[]) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    const calendarTexts = t('calendar');
    contentEl.createEl('h2', { text: `${this.dateStr} ${calendarTexts.workItems}` });

    if (this.dateItems.length === 0) {
      contentEl.createEl('p', { text: calendarTexts.noWorkItems });
    } else {
      const ul = contentEl.createEl('ul');
      this.dateItems.forEach((item: Item) => {
        const li = ul.createEl('li');
        li.createEl('span', { text: item.content });
        if (item.task) {
          li.createEl('br');
          li.createEl('small', { text: `${calendarTexts.task}: ${item.task.name}` });
        }
        if (item.project) {
          li.createEl('br');
          li.createEl('small', { text: `${calendarTexts.project}: ${item.project.name}` });
        }
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export const CalendarViewComponent = forwardRef((_, ref) => {
  const pluginContext = usePlugin();
  const plugin = pluginContext?.plugin;
  const refreshKey = pluginContext?.refreshKey ?? 0;
  const refresh = pluginContext?.refresh;
  const selectedGroup = pluginContext?.selectedGroup ?? '';
  const setSelectedGroup = pluginContext?.setSelectedGroup;
  const availableGroups = pluginContext?.availableGroups ?? [];
  const app = useApp();
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<Calendar | null>(null);
  const parserRef = useRef<MarkdownParser | null>(null);
  const calendarOptionsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [missingConfig, setMissingConfig] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);

  // Filter events by selected group
  const filteredEvents = useMemo(() => {
    if (!selectedGroup) return allEvents;
    return allEvents.filter(event => event.projectGroupId === selectedGroup);
  }, [allEvents, selectedGroup]);

  // Expose calendar instance to parent via ref
  useImperativeHandle(ref, () => ({
    getCalendarInstance: () => calendarInstanceRef.current
  }));

  const handleEventClick = useCallback((info: any) => {
    if (!app || !plugin) return;

    const details: EventDetails = {
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      allDay: info.event.allDay,
      project: info.event.extendedProps.project,
      projectLinks: info.event.extendedProps.projectLinks,
      task: info.event.extendedProps.task,
      taskLinks: info.event.extendedProps.taskLinks,
      level: info.event.extendedProps.level,
      item: info.event.extendedProps.item,
      hasItems: info.event.extendedProps.hasItems,
      filePath: info.event.extendedProps.filePath,
      lineNumber: info.event.extendedProps.lineNumber
    };

    new EventDetailsModal(app, details, plugin).open();
  }, [app, plugin]);

  const handleDateClick = useCallback((info: any) => {
    if (!app || !parserRef.current) return;

    const items = parserRef.current.getAllItems();

    // Filter items for the clicked date
    const dateItems = items.filter((item: Item) => {
      // Check date string (YYYY-MM-DD)
      if (item.date === info.dateStr) return true;

      // Check startDateTime if it exists
      if (item.startDateTime && item.startDateTime.startsWith(info.dateStr)) return true;

      return false;
    });

    // Sort items by time (if available) or order in file
    dateItems.sort((a, b) => {
      if (a.startDateTime && b.startDateTime) {
        return a.startDateTime.localeCompare(b.startDateTime);
      }
      if (a.startDateTime) return -1;
      if (b.startDateTime) return 1;
      return 0;
    });

    new DateDetailsModal(app, info.dateStr, dateItems).open();
  }, [app]);

  const handleEventContent = useCallback((info: any) => {
    const task = info.event.extendedProps.task;
    const viewType = info.view.type;

    if (isListView(viewType) && task) {
      const container = document.createElement('div');
      container.className = 'fc-list-event-task';
      container.innerHTML = `
        <div class="fc-list-event-title-main">${info.event.title}</div>
        <div class="fc-list-event-task-name">${task}</div>
      `;
      return { domNodes: [container] };
    }

    if ((viewType === 'timeGridDay' || viewType === 'timeGridWeek') && task) {
      return { html: `
        <div class="fc-event-main-frame">
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">
              ${info.timeText ? `<span class="fc-event-time" style="margin-right: 4px;">${info.timeText}</span>` : ''}
              ${info.event.title}
              <span class="hk-work-event-task-inline">${task}</span>
            </div>
          </div>
        </div>
      ` };
    }

    if (viewType === 'dayGridMonth' && task) {
      return { html: `
        <div class="fc-event-main-frame">
          <div class="fc-event-title-container">
            <div class="fc-event-title">
              ${info.timeText ? `<span class="fc-event-time" style="margin-right: 4px;">${info.timeText}</span>` : ''}
              ${info.event.title}
              <span class="hk-work-event-task-inline">${task}</span>
            </div>
          </div>
        </div>
      ` };
    }

    return { html: `<div class="fc-event-title">${info.event.title}</div>` };
  }, []);

  const snapTo15Minutes = useCallback((date: Date): Date => {
    const snapped = new Date(date);
    const minutes = snapped.getMinutes();
    const snappedMinutes = Math.round(minutes / 15) * 15;
    snapped.setMinutes(snappedMinutes, 0, 0);
    return snapped;
  }, []);

  const updateEventTimeInMarkdown = useCallback(async (info: any) => {
    if (!plugin || !app) {
      console.log('[BulletJournal] Plugin or app is null');
      return;
    }

    let start = info.event.start;
    let end = info.event.end;
    const allDay = info.event.allDay;
    const { filePath, lineNumber } = info.event.extendedProps;

    if (!filePath || !lineNumber || !start) {
      new Notice(t('calendar').cannotUpdate);
      return;
    }

    // Snap start time to 15-minute intervals
    start = snapTo15Minutes(start);

    // If no end time, use start + 1 hour (same as FullCalendar default)
    let eventEnd = end;
    if (!eventEnd && start) {
      eventEnd = new Date(start.getTime() + 60 * 60 * 1000);
    } else if (eventEnd) {
      // Snap end time to 15-minute intervals
      eventEnd = snapTo15Minutes(eventEnd);
    }

    try {
      // 使用 Obsidian API 获取文件
      const file = app.vault.getAbstractFileByPath(filePath);
      if (!file) {
        new Notice(t('calendar').fileNotFound);
        return;
      }

      const startDateTime = formatDateTimeForMarkdown(start);
      const date = startDateTime.split(' ')[0];

      // 根据是否为全天事件生成不同格式的时间字符串
      let newTimeStr: string;
      if (allDay) {
        // 全天事件使用纯日期格式
        newTimeStr = `@${date}`;
      } else {
        // 非全天事件使用时间范围格式
        const endDateTime = formatDateTimeForMarkdown(eventEnd!);
        const startTime = startDateTime.split(' ')[1];
        const endTime = endDateTime.split(' ')[1];
        newTimeStr = `@${date} ${startTime}~${endTime}`;
      }

      // 使用 app.vault.process() 修改文件
      await app.vault.process(file as any, (content) => {
        const lines = content.split('\n');

        if (lineNumber <= 0 || lineNumber > lines.length) {
          new Notice(t('calendar').lineOutOfRange);
          return content;
        }

        const lineIndex = lineNumber - 1;
        const originalLine = lines[lineIndex];

        // Replace old time patterns with new format
        let updatedLine = originalLine;
        if (DATE_TIME_RANGE_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(DATE_TIME_RANGE_PATTERN, newTimeStr);
        } else if (SINGLE_DATE_TIME_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(SINGLE_DATE_TIME_PATTERN, newTimeStr);
        } else if (DATE_ONLY_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(DATE_ONLY_PATTERN, newTimeStr);
        }

        if (updatedLine !== originalLine) {
          lines[lineIndex] = updatedLine;
          new Notice(t('calendar').timeUpdated);
          return lines.join('\n');
        }

        new Notice(t('calendar').timeFormatNotFound);
        return content;
      });
    } catch (error) {
      console.error('[BulletJournal] Error updating event time:', error);
      new Notice(t('calendar').updateTimeFailed);
    }
  }, [plugin, app, snapTo15Minutes]);

  const handleEventDrop = useCallback((info: any) => {
    updateEventTimeInMarkdown(info);
  }, [updateEventTimeInMarkdown]);

  const handleEventResize = useCallback((info: any) => {
    updateEventTimeInMarkdown(info);
  }, [updateEventTimeInMarkdown]);

  const handleCalendarEventContextMenu = useCallback((info: any, mouseEvent: MouseEvent) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    
    const extendedProps = info.event.extendedProps;
    const eventData = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      allDay: info.event.allDay,
      extendedProps: {
        filePath: extendedProps.filePath,
        lineNumber: extendedProps.lineNumber,
        status: extendedProps.status,
        task: extendedProps.task,
        item: extendedProps.item,
        project: extendedProps.project
      }
    };

    showCalendarEventContextMenu(mouseEvent, eventData, {
      onComplete: async () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const success = await updateItemStatus(app, extendedProps.filePath, extendedProps.lineNumber, 'completed');
        if (success && refresh) refresh();
      },
      onMigrateToday: async () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const todayDate = getTodayDate();
        const success = await updateItemDate(app, extendedProps.filePath, extendedProps.lineNumber, todayDate);
        if (success && refresh) refresh();
      },
      onMigrateTomorrow: async () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const tomorrowDate = getTomorrowDate();
        const success = await updateItemDate(app, extendedProps.filePath, extendedProps.lineNumber, tomorrowDate);
        if (success && refresh) refresh();
      },
      onMigrateCustom: () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const dateStr = info.event.startStr.split('T')[0];
        const modal = new DatePickerModal(app, '选择迁移日期', dateStr, async (newDate: string) => {
          const success = await updateItemDate(app, extendedProps.filePath!, extendedProps.lineNumber!, newDate);
          if (success && refresh) refresh();
        });
        modal.open();
      },
      onAbandon: async () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const success = await updateItemStatus(app, extendedProps.filePath, extendedProps.lineNumber, 'abandoned');
        if (success && refresh) refresh();
      },
      onOpenDoc: async () => {
        if (!app || !extendedProps.filePath || !extendedProps.lineNumber) return;
        const { openFileAtLine } = await import('../utils/fileUtils');
        await openFileAtLine(app, extendedProps.filePath, extendedProps.lineNumber);
      },
      onShowDetail: () => {
        if (!app || !plugin) return;
        const details: EventDetails = {
          title: info.event.title,
          start: info.event.startStr,
          end: info.event.endStr,
          allDay: info.event.allDay,
          project: extendedProps.project,
          projectLinks: extendedProps.projectLinks,
          task: extendedProps.task,
          taskLinks: extendedProps.taskLinks,
          level: extendedProps.level,
          item: extendedProps.item,
          hasItems: extendedProps.hasItems,
          filePath: extendedProps.filePath,
          lineNumber: extendedProps.lineNumber
        };
        new EventDetailsModal(app, details, plugin).open();
      }
    });
  }, [app, plugin, refresh]);

  const handleEventDidMount = useCallback((info: any) => {
    info.el.addEventListener('contextmenu', (e: MouseEvent) => {
      handleCalendarEventContextMenu(info, e);
    }, true);
  }, [handleCalendarEventContextMenu]);

  const calendarTexts = t('calendar');
  const calendarOptions = useMemo(() => ({
    plugins: [dayGridPlugin, timeGridPluginOriginal, listPlugin, interactionPlugin],
    initialView: 'timeGridDay',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: calendarTexts.today,
      month: calendarTexts.month,
      week: calendarTexts.week,
      day: calendarTexts.day,
      list: calendarTexts.list
    },
    locale: 'zh-cn',
    firstDay: 1,
    height: '100%',
    eventDisplay: 'block',
    editable: true,
    eventResizableFromStart: true,
    nowIndicator: true,
    views: {
      timeGridWeek: {
        slotDuration: '00:30:00',
        snapDuration: '00:15:00'
      },
      timeGridDay: {
        slotDuration: '00:30:00',
        snapDuration: '00:15:00'
      }
    },
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    eventContent: handleEventContent,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    eventDidMount: handleEventDidMount
  }), [handleEventClick, handleDateClick, handleEventContent, handleEventDrop, handleEventResize, handleEventDidMount, calendarTexts]);

  calendarOptionsRef.current = calendarOptions;

  const isLoadingRef = useRef(false);
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  console.log('[BulletJournal Debug] Component render, instanceId:', instanceIdRef.current, 'isLoadingRef:', isLoadingRef.current);

  const loadCalendarData = useCallback(async () => {
    console.log('[BulletJournal Debug] loadCalendarData called, instanceId:', instanceIdRef.current, 'isLoadingRef:', isLoadingRef.current, 'plugin:', !!plugin);
    if (!plugin || !calendarRef.current) {
      console.log('[BulletJournal Debug] Early return, plugin:', !!plugin, 'calendarRef:', !!calendarRef.current);
      return;
    }

    // Prevent concurrent loading
    if (isLoadingRef.current) {
      console.log('[BulletJournal Debug] Already loading, skipping');
      return;
    }

    isLoadingRef.current = true;
    console.log('[BulletJournal Debug] Set isLoadingRef to true');
    setIsLoading(true);

    try {
      const enabledDirs = plugin.settings.projectDirectories
        .filter(d => d.enabled && d.path)
        .map(d => d.path);

      if (enabledDirs.length === 0) {
        setMissingConfig(true);
        new Notice(t('config').setDirectory);
        setIsLoading(false);
        return;
      }
      setMissingConfig(false);

      const dirConfigs = plugin.settings.projectDirectories
        .filter(d => d.enabled && d.path)
        .map(d => ({ path: d.path, groupId: d.groupId }));

      const vaultRoot = app ? (app.vault as any).adapter?.basePath : undefined;
      const parser = new MarkdownParser(enabledDirs, dirConfigs, vaultRoot);
      parserRef.current = parser;

      const projects = parser.parseAllProjects();
      const events = DataConverter.projectsToCalendarEvents(projects);
      setAllEvents(events);

      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.removeAllEvents();
        calendarInstanceRef.current.addEventSource(events);
        setTimeout(() => {
          if (calendarInstanceRef.current) {
            calendarInstanceRef.current.updateSize();
          }
        }, 100);
      } else {
        const calendar = new Calendar(calendarRef.current!, {
          ...calendarOptionsRef.current,
          events
        });

        calendar.render();
        calendarInstanceRef.current = calendar;
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      new Notice('Error loading calendar data');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [plugin]);

  // Update calendar events when selected group changes
  useEffect(() => {
    if (calendarInstanceRef.current) {
      calendarInstanceRef.current.removeAllEvents();
      calendarInstanceRef.current.addEventSource(filteredEvents);
    }
  }, [filteredEvents]);

  useEffect(() => {
    let isMounted = true;

    const initCalendar = async () => {
      if (!isMounted) return;
      await loadCalendarData();
    };

    initCalendar();

    return () => {
      isMounted = false;
    };
  }, [loadCalendarData, refreshKey]);

  // Log when component unmounts
  useEffect(() => {
    return () => {
      console.log('[BulletJournal Debug] Component unmount, instanceId:', instanceIdRef.current);
    };
  }, []);

  // Add ResizeObserver to handle container size changes
  useEffect(() => {
    const currentRef = calendarRef.current;
    if (!currentRef) return;

    const resizeObserver = new ResizeObserver(() => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.updateSize();
      }
    });

    resizeObserver.observe(currentRef);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Re-run if ref changes (though unlikely for same component instance)

  useEffect(() => {
    return () => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
        calendarInstanceRef.current = null;
      }
      parserRef.current = null;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    if (refresh) {
      refresh();
      new Notice(t('calendar').dataRefreshed);
    }
  }, [refresh]);

  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedGroup) {
      setSelectedGroup(e.target.value);
    }
  }, [setSelectedGroup]);

  if (missingConfig) {
    return (
      <div className="hk-work-container">
        <ViewHeader
          title={t('calendar').title}
          subtitle={t('calendar').subtitle}
        />
        <div className="error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <h3>{t('calendar').noDataDirectory}</h3>
          <p>{t('calendar').configureDirectory}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hk-work-container">
      <ViewHeader
        title={t('calendar').title}
        subtitle={t('calendar').subtitle}
        actions={
          <>
            <GroupSelect
              groups={availableGroups}
              value={selectedGroup}
              onChange={handleGroupChange}
            />
            <RefreshButton
              onClick={handleRefresh}
              isLoading={isLoading}
              text={t('common').refresh}
              title={t('calendar').refreshData}
            />
          </>
        }
      />
      <div ref={calendarRef} className="calendar-container" />
    </div>
  );
});
