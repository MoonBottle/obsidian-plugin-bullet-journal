import { Menu, MenuItem, Notice } from 'obsidian';
import { Item } from '../models/types';
import { t } from '../i18n';
import type { Translations } from '../i18n/locales/zh-cn';

// Obsidian 未公开 API：MenuItem.setSubmenu() 用于右侧展开的嵌套子菜单
interface MenuItemWithSubmenu extends MenuItem {
  setSubmenu(): Menu;
}

function addMigrateSubmenu(menu: Menu, contextMenuTexts: Translations['contextMenu'], options: ContextMenuOptions): void {
  menu.addItem((menuItem: MenuItem) => {
    menuItem
      .setTitle(contextMenuTexts.migrate)
      .setIcon('arrow-right');

    const submenu = (menuItem as MenuItemWithSubmenu).setSubmenu();
    submenu.addItem((subItem: MenuItem) => {
      subItem
        .setTitle(contextMenuTexts.migrateToday)
        .setIcon('calendar')
        .onClick(() => {
          if (options.onMigrateToday) options.onMigrateToday();
        });
    });
    submenu.addItem((subItem: MenuItem) => {
      subItem
        .setTitle(contextMenuTexts.migrateTomorrow)
        .setIcon('calendar')
        .onClick(() => {
          if (options.onMigrateTomorrow) options.onMigrateTomorrow();
        });
    });
    submenu.addItem((subItem: MenuItem) => {
      subItem
        .setTitle(contextMenuTexts.migrateCustom)
        .setIcon('calendar')
        .onClick(() => {
          if (options.onMigrateCustom) options.onMigrateCustom();
        });
    });
  });
}

export interface ContextMenuOptions {
  onComplete?: () => void;
  onMigrateToday?: () => void;
  onMigrateTomorrow?: () => void;
  onMigrateCustom?: () => void;
  onAbandon?: () => void;
  onOpenDoc?: () => void;
  onShowDetail?: () => void;
  onShowCalendar?: () => void;
}

export function showItemContextMenu(
  event: MouseEvent,
  item: Item,
  options: ContextMenuOptions
): void {
  const menu = new Menu();
  const isPending = item.status !== 'completed' && item.status !== 'abandoned';
  const contextMenuTexts = t('contextMenu');

  if (isPending) {
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.complete)
        .setIcon('check')
        .onClick(() => {
          if (options.onComplete) {
            options.onComplete();
          }
        });
    });

    addMigrateSubmenu(menu, contextMenuTexts, options);

    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.abandon)
        .setIcon('x')
        .onClick(() => {
          if (options.onAbandon) {
            options.onAbandon();
          }
        });
    });

    menu.addSeparator();
  }

  menu.addItem((menuItem: MenuItem) => {
    menuItem
      .setTitle(contextMenuTexts.openDoc)
      .setIcon('file')
      .onClick(() => {
        if (options.onOpenDoc) {
          options.onOpenDoc();
        }
      });
  });

  menu.addItem((menuItem: MenuItem) => {
    menuItem
      .setTitle(contextMenuTexts.showDetail)
      .setIcon('info')
      .onClick(() => {
        if (options.onShowDetail) {
          options.onShowDetail();
        }
      });
  });

  if (options.onShowCalendar) {
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.showCalendar)
        .setIcon('calendar')
        .onClick(() => {
          if (options.onShowCalendar) {
            options.onShowCalendar();
          }
        });
    });
  }

  menu.showAtMouseEvent(event as MouseEvent);
}

export function showCalendarEventContextMenu(
  event: MouseEvent,
  eventData: {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    extendedProps: {
      filePath?: string;
      lineNumber?: number;
      status?: string;
      task?: string;
      item?: string;
      project?: string;
    };
  },
  options: ContextMenuOptions
): void {
  const menu = new Menu();
  const isPending = eventData.extendedProps.status !== 'completed' && eventData.extendedProps.status !== 'abandoned';
  const contextMenuTexts = t('contextMenu');

  if (isPending) {
    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.complete)
        .setIcon('check')
        .onClick(() => {
          if (options.onComplete) {
            options.onComplete();
          }
        });
    });

    addMigrateSubmenu(menu, contextMenuTexts, options);

    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.abandon)
        .setIcon('x')
        .onClick(() => {
          if (options.onAbandon) {
            options.onAbandon();
          }
        });
    });

    menu.addSeparator();
  }

  menu.addItem((menuItem: MenuItem) => {
    menuItem
      .setTitle(contextMenuTexts.openDoc)
      .setIcon('file')
      .onClick(() => {
        if (options.onOpenDoc) {
          options.onOpenDoc();
        }
      });
  });

  menu.addItem((menuItem: MenuItem) => {
    menuItem
      .setTitle(contextMenuTexts.showDetail)
      .setIcon('info')
      .onClick(() => {
        if (options.onShowDetail) {
          options.onShowDetail();
        }
      });
  });

  menu.showAtMouseEvent(event);
}
