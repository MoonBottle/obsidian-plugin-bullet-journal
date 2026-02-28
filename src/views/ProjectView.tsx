import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import BulletJournalPlugin from '../../main';
import { ProjectViewComponent } from '../components/ProjectView';
import { AppContext } from '../context/AppContext';
import { PluginProvider } from '../context/PluginContext';
import { t } from '../i18n';

export const PROJECT_VIEW_TYPE = 'bullet-journal-project-view';

export class ProjectView extends ItemView {
  private plugin: BulletJournalPlugin;
  root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: BulletJournalPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return PROJECT_VIEW_TYPE;
  }

  getDisplayText() {
    return t('views').project;
  }

  getIcon() {
    return 'folder';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();

    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <PluginProvider plugin={this.plugin}>
            <ProjectViewComponent />
          </PluginProvider>
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
