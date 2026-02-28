import { App, Modal, TFile, Notice, setIcon, Plugin } from 'obsidian';
import { CALENDAR_VIEW_TYPE } from '../views/CalendarView';
import { openFileAtLine } from '../utils/fileUtils';
import {
  DATE_TIME_RANGE_PATTERN,
  SINGLE_DATE_TIME_PATTERN,
  DATE_ONLY_PATTERN,
  formatDateTime,
  calculateDuration,
  toISODateString
} from '../utils/dateUtils';

export interface EventDetails {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  project?: string;
  projectLinks?: Array<{ name: string; url: string }>;
  task?: string;
  taskLinks?: Array<{ name: string; url: string }>;
  level?: string;
  item?: string;
  hasItems?: boolean;
  filePath?: string;
  lineNumber?: number;
  fromEditor?: boolean;
}

const createCopyButton = (container: HTMLElement, value: string): HTMLButtonElement => {
  const copyBtn = container.createEl('button', {
    cls: 'bullet-journal-copy-btn',
    attr: { 'aria-label': '复制' }
  });
  copyBtn.style.cssText = `
    padding: 0 !important;
    margin-left: 6px !important;
    min-width: auto !important;
    height: auto !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s ease;
  `;
  copyBtn.addEventListener('mouseenter', () => copyBtn.style.color = 'var(--interactive-accent)');
  copyBtn.addEventListener('mouseleave', () => copyBtn.style.color = 'var(--text-muted)');
  setIcon(copyBtn, 'copy');
  const iconEl = copyBtn.querySelector('svg');
  if (iconEl) {
    iconEl.style.width = '12px';
    iconEl.style.height = '12px';
  }
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      new Notice('已复制到剪贴板');
    } catch (err) {
      new Notice('复制失败');
    }
  });
  return copyBtn;
};

export class EventDetailsModal extends Modal {
  constructor(app: App, private details: EventDetails, private plugin?: Plugin) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('bullet-journal-event-modal');

    const cleanTitle = this.details.title.replace(/#任务/g, '').trim();
    contentEl.createEl('h2', { text: cleanTitle, cls: 'bullet-journal-modal-title' });

    const infoGrid = contentEl.createEl('div', { cls: 'bullet-journal-modal-info-grid' });

    const dateLabel = this.details.end && this.details.start !== this.details.end ? '时间' : '日期';
    const dateValue = this.details.end && this.details.start !== this.details.end
      ? `${formatDateTime(this.details.start, this.details.allDay)} - ${formatDateTime(this.details.end, this.details.allDay)}`
      : formatDateTime(this.details.start, this.details.allDay);
    this.createInfoRow(infoGrid, dateLabel, dateValue);

    if (this.details.end && this.details.start !== this.details.end) {
      let lunchBreakStart: string | undefined;
      let lunchBreakEnd: string | undefined;
      if (this.plugin && (this.plugin as any).settings) {
        lunchBreakStart = (this.plugin as any).settings.lunchBreakStart;
        lunchBreakEnd = (this.plugin as any).settings.lunchBreakEnd;
      }
      const duration = calculateDuration(this.details.start, this.details.end, lunchBreakStart, lunchBreakEnd);
      if (duration) {
        const durationRow = infoGrid.createEl('div', { cls: 'bullet-journal-modal-info-row' });
        durationRow.createEl('span', { text: '耗时:', cls: 'bullet-journal-modal-info-label' });
        const durationValueContainer = durationRow.createEl('div', { cls: 'bullet-journal-modal-desc-value' });
        durationValueContainer.createEl('span', { text: duration, cls: 'bullet-journal-modal-info-value' });
        createCopyButton(durationValueContainer, duration);
      }
    }

    if (this.details.project) {
      this.createInfoRow(infoGrid, '项目', this.details.project);
    }

    if (this.details.projectLinks && this.details.projectLinks.length > 0) {
      this.createLinksRow(infoGrid, '项目链接', this.details.projectLinks);
    }

    if (this.details.task) {
      const taskRow = infoGrid.createEl('div', { cls: 'bullet-journal-modal-info-row' });
      taskRow.createEl('span', { text: '任务:', cls: 'bullet-journal-modal-info-label' });
      const taskValueContainer = taskRow.createEl('div', { cls: 'bullet-journal-modal-desc-value' });
      taskValueContainer.createEl('span', { text: this.details.task, cls: 'bullet-journal-modal-info-value' });
      createCopyButton(taskValueContainer, this.details.task);
    }

    if (this.details.taskLinks && this.details.taskLinks.length > 0) {
      this.createLinksRow(infoGrid, '任务链接', this.details.taskLinks);
    }

    if (this.details.level) {
      this.createInfoRow(infoGrid, '级别', this.details.level);
    }

    if (this.details.hasItems && this.details.item) {
      const descRow = infoGrid.createEl('div', { cls: 'bullet-journal-modal-info-row' });
      descRow.createEl('span', { text: '事项:', cls: 'bullet-journal-modal-info-label' });
      const descValueContainer = descRow.createEl('div', { cls: 'bullet-journal-modal-desc-value' });
      descValueContainer.createEl('span', { text: this.details.item, cls: 'bullet-journal-modal-info-value' });
      createCopyButton(descValueContainer, this.details.item);
    }

    contentEl.createEl('hr', { cls: 'bullet-journal-modal-divider' });

    const buttonsContainer = contentEl.createEl('div', { cls: 'bullet-journal-modal-buttons' });

    if (this.details.fromEditor) {
      const openCalendarBtn = buttonsContainer.createEl('button', {
        text: '查看日历',
        cls: 'bullet-journal-open-file-btn'
      });
      openCalendarBtn.addEventListener('click', async () => {
        const dateStr = this.details.start.split('T')[0];

        let leaf = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE)[0];
        if (!leaf) {
          leaf = this.app.workspace.getRightLeaf(false);
          await leaf.setViewState({ type: CALENDAR_VIEW_TYPE });
        }

        this.app.workspace.revealLeaf(leaf);

        const view = leaf.view as any;
        if (view && view.componentRef?.current) {
          const calendarInstance = view.componentRef.current.getCalendarInstance();
          if (calendarInstance) {
            calendarInstance.gotoDate(dateStr);
            calendarInstance.changeView('timeGridDay');
          }
        }

        this.close();
      });
    } else if (this.details.filePath) {
      const openButton = buttonsContainer.createEl('button', {
        text: '打开文档',
        cls: 'bullet-journal-open-file-btn'
      });
      openButton.addEventListener('click', async () => {
        const success = await openFileAtLine(this.app, this.details.filePath!, this.details.lineNumber);
        if (success) {
          this.close();
        } else {
          new Notice('无法找到文件: ' + this.details.filePath);
        }
      });
    }
  }

  private createInfoRow(container: HTMLElement, label: string, value: string) {
    const row = container.createEl('div', { cls: 'bullet-journal-modal-info-row' });
    row.createEl('span', { text: `${label}:`, cls: 'bullet-journal-modal-info-label' });
    row.createEl('span', { text: value, cls: 'bullet-journal-modal-info-value' });
  }

  private createLinkRow(container: HTMLElement, label: string, url: string, displayName?: string) {
    const row = container.createEl('div', { cls: 'bullet-journal-modal-info-row' });
    row.createEl('span', { text: `${label}:`, cls: 'bullet-journal-modal-info-label' });
    const link = row.createEl('a', {
      text: displayName || url,
      cls: 'bullet-journal-modal-link'
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(url, '_blank');
    });
  }

  private createLinksRow(container: HTMLElement, label: string, links: Array<{ name: string; url: string }>) {
    const row = container.createEl('div', { cls: 'bullet-journal-modal-info-row' });
    row.createEl('span', { text: `${label}:`, cls: 'bullet-journal-modal-info-label' });
    const valueContainer = row.createEl('div', { cls: 'bullet-journal-modal-desc-value' });

    links.forEach((link, index) => {
      const linkEl = valueContainer.createEl('a', {
        text: link.name,
        cls: 'bullet-journal-modal-link'
      });
      linkEl.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(link.url, '_blank');
      });
      if (index < links.length - 1) {
        valueContainer.createEl('span', { text: ' ' });
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private async postponeToTomorrow() {
    if (!this.details.filePath || !this.details.lineNumber) {
      new Notice('无法找到文件信息');
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toISODateString(tomorrow);

      const file = this.app.vault.getAbstractFileByPath(this.details.filePath);
      if (!file || !(file instanceof TFile)) {
        new Notice('无法找到文件');
        return;
      }

      await this.app.vault.process(file, (content) => {
        const lines = content.split('\n');
        const lineIndex = this.details.lineNumber! - 1;

        if (lineIndex < 0 || lineIndex >= lines.length) {
          new Notice('行号超出范围');
          return content;
        }

        const originalLine = lines[lineIndex];

        let updatedLine = originalLine;
        if (DATE_TIME_RANGE_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(DATE_TIME_RANGE_PATTERN, `@${tomorrowStr}`);
        } else if (SINGLE_DATE_TIME_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(SINGLE_DATE_TIME_PATTERN, `@${tomorrowStr}`);
        } else if (DATE_ONLY_PATTERN.test(originalLine)) {
          updatedLine = originalLine.replace(DATE_ONLY_PATTERN, `@${tomorrowStr}`);
        }

        if (updatedLine !== originalLine) {
          lines[lineIndex] = updatedLine;
          new Notice('已推迟到明天');
          this.close();
          return lines.join('\n');
        }

        new Notice('未找到时间格式');
        return content;
      });
    } catch (error) {
      console.error('[BulletJournal] Error postponing event:', error);
      new Notice('推迟失败');
    }
  }
}
