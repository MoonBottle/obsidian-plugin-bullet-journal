import { StrictMode, createRef } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { Calendar } from '@fullcalendar/core';
import BulletJournalPlugin from '../../main';
import { CalendarViewComponent } from '../components/CalendarView';
import { AppContext } from '../context/AppContext';
import { PluginProvider } from '../context/PluginContext';
import { t } from '../i18n';

export const CALENDAR_VIEW_TYPE = 'bullet-journal-calendar-view';

// 定义 CalendarViewComponent 暴露的接口
interface CalendarViewComponentHandle {
  getCalendarInstance: () => Calendar | null;
}

export class CalendarView extends ItemView {
  private plugin: BulletJournalPlugin;
  root: Root | null = null;
  private unsubscribeRefresh: (() => void) | null = null;
  calendarInstance: Calendar | null = null;
  private componentRef = createRef<CalendarViewComponentHandle>();

  constructor(leaf: WorkspaceLeaf, plugin: BulletJournalPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return CALENDAR_VIEW_TYPE;
  }

  getDisplayText() {
    return t('views').calendar;
  }

  getIcon() {
    return 'calendar';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();

    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <PluginProvider plugin={this.plugin}>
            <CalendarViewComponent ref={this.componentRef} />
          </PluginProvider>
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose() {
    if (this.unsubscribeRefresh) {
      this.unsubscribeRefresh();
      this.unsubscribeRefresh = null;
    }
    this.root?.unmount();
    this.root = null;
    this.calendarInstance = null;
  }

  // Method to expose calendar instance from component
  setCalendarInstance(instance: Calendar | null) {
    this.calendarInstance = instance;
  }
}
