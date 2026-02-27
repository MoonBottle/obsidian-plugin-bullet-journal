import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import HKWorkPlugin from '../../main';
import { GanttViewComponent } from '../components/GanttView';
import { AppContext } from '../context/AppContext';
import { PluginProvider } from '../context/PluginContext';
import { t } from '../i18n';

export const GANTT_VIEW_TYPE = 'hk-work-gantt-view';

export class GanttView extends ItemView {
  private plugin: HKWorkPlugin;
  root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: HKWorkPlugin) {
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

    this.root = createRoot(container);
    this.root.render(
      // StrictMode removed to prevent double initialization of dhtmlx-gantt
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
