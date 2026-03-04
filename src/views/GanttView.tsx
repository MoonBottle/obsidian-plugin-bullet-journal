import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import BulletJournalPlugin from '../../main';
import { AppContext } from '../context/AppContext';
import { PluginProvider } from '../context/PluginContext';
import { t } from '../i18n';

export const GANTT_VIEW_TYPE = 'bullet-journal-gantt-view';

export class GanttView extends ItemView {
  private plugin: BulletJournalPlugin;
  root: ReturnType<typeof createRoot> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: BulletJournalPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return GANTT_VIEW_TYPE;
  }

  getDisplayText() {
    return t('views').gantt;
  }

  getIcon() {
    return 'graph';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.createEl('div', { cls: 'bullet-journal-loading', text: t('common').loading });

    const { GanttViewComponent } = await import('../components/GanttView');
    container.empty();
    this.root = createRoot(container);
    this.root.render(
      <AppContext.Provider value={this.app}>
        <PluginProvider plugin={this.plugin}>
          <GanttViewComponent />
        </PluginProvider>
      </AppContext.Provider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
