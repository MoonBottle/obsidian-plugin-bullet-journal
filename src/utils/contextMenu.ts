import { Menu, MenuItem, Notice } from 'obsidian';
import { Item } from '../models/types';
import { t } from '../i18n';

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
  event: React.MouseEvent | MouseEvent,
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

    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.migrate)
        .setIcon('arrow-right')
        .onClick(() => {
          const submenu = new Menu();
          
          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateToday)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateToday) {
                  options.onMigrateToday();
                }
              });
          });

          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateTomorrow)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateTomorrow) {
                  options.onMigrateTomorrow();
                }
              });
          });

          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateCustom)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateCustom) {
                  options.onMigrateCustom();
                }
              });
          });

          submenu.showAtMouseEvent(event as MouseEvent);
        });
    });

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

    menu.addItem((menuItem: MenuItem) => {
      menuItem
        .setTitle(contextMenuTexts.migrate)
        .setIcon('arrow-right')
        .onClick(() => {
          const submenu = new Menu();
          
          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateToday)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateToday) {
                  options.onMigrateToday();
                }
              });
          });

          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateTomorrow)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateTomorrow) {
                  options.onMigrateTomorrow();
                }
              });
          });

          submenu.addItem((subItem: MenuItem) => {
            subItem
              .setTitle(contextMenuTexts.migrateCustom)
              .setIcon('calendar')
              .onClick(() => {
                if (options.onMigrateCustom) {
                  options.onMigrateCustom();
                }
              });
          });

          submenu.showAtMouseEvent(event);
        });
    });

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
