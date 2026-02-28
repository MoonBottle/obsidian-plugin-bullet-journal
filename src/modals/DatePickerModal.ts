import { App, Modal } from 'obsidian';

export class DatePickerModal extends Modal {
  private selectedDate: string;
  private currentYear: number;
  private currentMonth: number;
  private onConfirm: (date: string) => void;
  private title: string;
  private contentEl_div: HTMLElement;

  constructor(
    app: App,
    title: string,
    initialDate: string,
    onConfirm: (date: string) => void
  ) {
    super(app);
    this.title = title;
    this.selectedDate = initialDate;
    this.onConfirm = onConfirm;
    
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    
    if (initialDate) {
      const parts = initialDate.split('-');
      if (parts.length === 3) {
        this.currentYear = parseInt(parts[0]);
        this.currentMonth = parseInt(parts[1]) - 1;
      }
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('bullet-journal-date-picker-modal');

    contentEl.createEl('h2', { text: this.title });

    this.contentEl_div = contentEl.createDiv({ cls: 'bullet-journal-date-picker-content' });
    this.renderContent();
  }

  private renderContent() {
    this.contentEl_div.empty();
    
    const navContainer = this.contentEl_div.createDiv({ cls: 'bullet-journal-date-picker-nav' });
    
    navContainer.createEl('button', { text: '«', cls: 'bullet-journal-date-picker-nav-btn' }, (btn) => {
      btn.addEventListener('click', () => {
        this.currentYear--;
        this.renderContent();
      });
    });
    
    navContainer.createEl('button', { text: '‹', cls: 'bullet-journal-date-picker-nav-btn' }, (btn) => {
      btn.addEventListener('click', () => {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.renderContent();
      });
    });
    
    navContainer.createEl('span', { 
      text: `${this.currentYear}年${this.currentMonth + 1}月`, 
      cls: 'bullet-journal-date-picker-month-label' 
    });
    
    navContainer.createEl('button', { text: '›', cls: 'bullet-journal-date-picker-nav-btn' }, (btn) => {
      btn.addEventListener('click', () => {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.renderContent();
      });
    });
    
    navContainer.createEl('button', { text: '»', cls: 'bullet-journal-date-picker-nav-btn' }, (btn) => {
      btn.addEventListener('click', () => {
        this.currentYear++;
        this.renderContent();
      });
    });

    const calendarContainer = this.contentEl_div.createDiv({ cls: 'bullet-journal-date-picker-calendar' });
    
    const headerRow = calendarContainer.createDiv({ cls: 'bullet-journal-date-picker-header' });
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
      headerRow.createEl('span', { text: day, cls: 'bullet-journal-date-picker-weekday' });
    });

    const gridContainer = calendarContainer.createDiv({ cls: 'bullet-journal-date-picker-grid' });
    
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      gridContainer.createEl('span', { cls: 'bullet-journal-date-picker-day empty' });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this.selectedDate;
      
      let classes = 'bullet-journal-date-picker-day';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';
      
      const dayEl = gridContainer.createEl('span', { text: String(day), cls: classes });
      dayEl.dataset.date = dateStr;
      
      dayEl.addEventListener('click', () => {
        this.selectedDate = dateStr;
        this.renderContent();
      });
    }

    const buttonsContainer = this.contentEl_div.createDiv({ cls: 'bullet-journal-date-picker-buttons' });
    
    buttonsContainer.createEl('button', { text: '今天', cls: 'bullet-journal-date-picker-btn' }, (btn) => {
      btn.addEventListener('click', () => {
        const todayDate = new Date();
        this.selectedDate = todayDate.toISOString().split('T')[0];
        this.currentYear = todayDate.getFullYear();
        this.currentMonth = todayDate.getMonth();
        this.renderContent();
      });
    });
    
    buttonsContainer.createEl('button', { text: '取消', cls: 'bullet-journal-date-picker-btn bullet-journal-date-picker-btn-cancel' }, (btn) => {
      btn.addEventListener('click', () => {
        this.close();
      });
    });
    
    buttonsContainer.createEl('button', { text: '确认', cls: 'bullet-journal-date-picker-btn bullet-journal-date-picker-btn-confirm' }, (btn) => {
      btn.addEventListener('click', () => {
        this.onConfirm(this.selectedDate);
        this.close();
      });
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
