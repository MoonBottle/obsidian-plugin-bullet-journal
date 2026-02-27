import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import HKWorkPlugin from '../../main';
import { TodoSidebar } from '../components/TodoSidebar';
import { AppContext } from '../context/AppContext';
import { PluginProvider } from '../context/PluginContext';
import { t } from '../i18n';
import { Item } from '../models/types';
import { openFileAtLine } from '../utils/fileUtils';

export const TODO_SIDEBAR_VIEW_TYPE = 'hk-work-todo-sidebar';

export class TodoSidebarView extends ItemView {
  private plugin: HKWorkPlugin;
  root: Root | null = null;
  private unsubscribeRefresh: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: HKWorkPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return TODO_SIDEBAR_VIEW_TYPE;
  }

  getDisplayText() {
    return t('todoSidebar').title;
  }

  getIcon() {
    return 'check-circle';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();

    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <PluginProvider plugin={this.plugin}>
            <TodoSidebar onItemClick={this.handleItemClick.bind(this)} />
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
  }

  private async handleItemClick(item: Item) {
    if (!item.project?.filePath) {
      return;
    }

    await openFileAtLine(this.app, item.project.filePath, item.lineNumber);
  }
}
