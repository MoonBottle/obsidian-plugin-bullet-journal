import { App, Modal } from 'obsidian';

export class DatePickerModal extends Modal {
  private selectedDate: string;
  private onConfirm: (date: string) => void;
  private title: string;

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
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('hk-work-date-picker-modal');

    contentEl.createEl('h2', { text: this.title });

    const dateContainer = contentEl.createEl('div', { cls: 'hk-work-date-picker-container' });
    
    const dateInput = dateContainer.createEl('input', {
      attr: {
        type: 'date',
        value: this.selectedDate
      }
    }) as HTMLInputElement;

    dateInput.addEventListener('change', () => {
      this.selectedDate = dateInput.value;
    });

    const buttonsContainer = contentEl.createEl('div', { cls: 'hk-work-modal-buttons' });

    const cancelButton = buttonsContainer.createEl('button', { text: '取消' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });

    const confirmButton = buttonsContainer.createEl('button', {
      text: '确认',
      cls: 'mod-cta'
    });
    confirmButton.addEventListener('click', () => {
      this.onConfirm(this.selectedDate);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
