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
  groupName?: string;
  project?: string;
  projectLinks?: Array<{ name: string; url: string }>;
  task?: string;
  taskLinks?: Array<{ name: string; url: string }>;
  level?: string;
  item?: string;
  itemLinks?: Array<{ name: string; url: string }>;
  hasItems?: boolean;
  filePath?: string;
  lineNumber?: number;
  fromEditor?: boolean;
  status?: 'pending' | 'completed' | 'abandoned';
}

const createCopyButton = (container: HTMLElement, value: string): HTMLButtonElement => {
  const copyBtn = container.createEl('button', {
    cls: 'bullet-journal-copy-btn',
    attr: { 'aria-label': '复制' }
  });
  copyBtn.style.cssText = `
    display: inline-flex !important;
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
    vertical-align: middle !important;
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
    this.titleEl.style.display = 'none';
    const { contentEl } = this;
    contentEl.addClass('bullet-journal-event-modal');

    // 弹框标题
    contentEl.createEl('h2', { text: '事项详情', cls: 'bullet-journal-modal-title' });

    // 项目卡片（含分组名标签）
    if (this.details.project || (this.details.projectLinks && this.details.projectLinks.length > 0) || this.details.groupName) {
      const projectCard = contentEl.createEl('div', { cls: 'bullet-journal-modal-card' });
      projectCard.createEl('div', { text: '项目', cls: 'bullet-journal-modal-card-title' });
      
      const projectContent = projectCard.createEl('div', { cls: 'bullet-journal-modal-card-content' });
      
      if (this.details.project) {
        projectContent.createEl('div', { 
          text: this.details.project, 
          cls: 'bullet-journal-modal-card-value' 
        });
      }
      
      if (this.details.groupName || (this.details.projectLinks && this.details.projectLinks.length > 0)) {
        const linksContainer = projectContent.createEl('div', { cls: 'bullet-journal-modal-tags' });
        if (this.details.groupName) {
          linksContainer.createEl('span', {
            text: this.details.groupName,
            cls: 'bullet-journal-modal-tag bullet-journal-modal-tag-level'
          });
        }
        if (this.details.projectLinks && this.details.projectLinks.length > 0) {
          this.details.projectLinks.forEach(link => {
            const tag = linksContainer.createEl('a', {
              text: link.name,
              cls: 'bullet-journal-modal-tag'
            });
            tag.addEventListener('click', (e) => {
              e.preventDefault();
              window.open(link.url, '_blank');
            });
          });
        }
      }
    }

    // 任务卡片
    if (this.details.task || this.details.level || (this.details.taskLinks && this.details.taskLinks.length > 0)) {
      const taskCard = contentEl.createEl('div', { cls: 'bullet-journal-modal-card' });
      taskCard.createEl('div', { text: '任务', cls: 'bullet-journal-modal-card-title' });

      const taskContent = taskCard.createEl('div', { cls: 'bullet-journal-modal-card-content' });

      // 任务名单独一行
      if (this.details.task) {
        const taskRow = taskContent.createEl('div', { cls: 'bullet-journal-modal-card-row' });
        taskRow.createEl('span', { text: this.details.task, cls: 'bullet-journal-modal-card-value' });
        createCopyButton(taskRow, this.details.task);
      }

      // 级别和任务链接放在同一行
      if (this.details.level || (this.details.taskLinks && this.details.taskLinks.length > 0)) {
        const linksRow = taskContent.createEl('div', { cls: 'bullet-journal-modal-card-row' });

        // 级别放在左侧
        if (this.details.level) {
          linksRow.createEl('span', {
            text: this.details.level,
            cls: 'bullet-journal-modal-tag bullet-journal-modal-tag-level'
          });
        }

        // 任务链接
        if (this.details.taskLinks && this.details.taskLinks.length > 0) {
          this.details.taskLinks.forEach(link => {
            const tag = linksRow.createEl('a', {
              text: link.name,
              cls: 'bullet-journal-modal-tag'
            });
            tag.addEventListener('click', (e) => {
              e.preventDefault();
              window.open(link.url, '_blank');
            });
          });
        }
      }
    }

    // 事项卡片
    const itemCard = contentEl.createEl('div', { cls: 'bullet-journal-modal-card' });
    itemCard.createEl('div', { text: '事项', cls: 'bullet-journal-modal-card-title' });
    
    const itemContent = itemCard.createEl('div', { cls: 'bullet-journal-modal-card-content' });
    
    // 时间行（包含时间和耗时）
    const timeRow = itemContent.createEl('div', { cls: 'bullet-journal-modal-time-row' });
    const calendarIcon = timeRow.createEl('span', { cls: 'bullet-journal-modal-icon' });
    setIcon(calendarIcon, 'calendar');

    const dateLabel = this.details.end && this.details.start !== this.details.end ? '时间' : '日期';
    const dateValue = this.details.end && this.details.start !== this.details.end
      ? `${formatDateTime(this.details.start, this.details.allDay)} - ${formatDateTime(this.details.end, this.details.allDay)}`
      : formatDateTime(this.details.start, this.details.allDay);
    timeRow.createEl('span', { text: dateValue, cls: 'bullet-journal-modal-time-text' });

    // 耗时（合并到同一行）
    if (this.details.end && this.details.start !== this.details.end) {
      let lunchBreakStart: string | undefined;
      let lunchBreakEnd: string | undefined;
      if (this.plugin && (this.plugin as any).settings) {
        lunchBreakStart = (this.plugin as any).settings.lunchBreakStart;
        lunchBreakEnd = (this.plugin as any).settings.lunchBreakEnd;
      }
      const duration = calculateDuration(this.details.start, this.details.end, lunchBreakStart, lunchBreakEnd);
      if (duration) {
        timeRow.createEl('span', { text: ' ', cls: 'bullet-journal-modal-time-spacer' });
        const clockIcon = timeRow.createEl('span', { cls: 'bullet-journal-modal-icon' });
        setIcon(clockIcon, 'clock');
        const durationText = timeRow.createEl('span', { text: duration, cls: 'bullet-journal-modal-time-text' });
        createCopyButton(timeRow, duration);
      }
    }
    
    // 事项描述和状态
    if (this.details.hasItems && this.details.item) {
      const descRow = itemContent.createEl('div', { cls: 'bullet-journal-modal-desc-row' });

      // 状态放在左侧
      if (this.details.status) {
        const statusConfig = {
          pending: { text: '待办', cls: 'bullet-journal-modal-tag-status-pending' },
          completed: { text: '已完成', cls: 'bullet-journal-modal-tag-status-completed' },
          abandoned: { text: '已放弃', cls: 'bullet-journal-modal-tag-status-abandoned' }
        }[this.details.status];
        descRow.createEl('span', {
          text: statusConfig.text,
          cls: statusConfig.cls
        });
      }

      descRow.createEl('span', { text: this.details.item, cls: 'bullet-journal-modal-card-value' });
      createCopyButton(descRow, this.details.item);
    }

    // 事项链接
    if (this.details.itemLinks && this.details.itemLinks.length > 0) {
      const itemLinksRow = itemContent.createEl('div', { cls: 'bullet-journal-modal-card-row' });

      this.details.itemLinks.forEach(link => {
        const tag = itemLinksRow.createEl('a', {
          text: link.name,
          cls: 'bullet-journal-modal-tag'
        });
        tag.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(link.url, '_blank');
        });
      });
    }

    // 按钮区域
    const buttonsContainer = contentEl.createEl('div', { cls: 'bullet-journal-modal-buttons' });

    // 取消按钮
    const cancelBtn = buttonsContainer.createEl('button', {
      text: '取消',
      cls: 'bullet-journal-cancel-btn'
    });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    if (this.details.fromEditor) {
      const openCalendarBtn = buttonsContainer.createEl('button', {
        text: '在日历中查看',
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
