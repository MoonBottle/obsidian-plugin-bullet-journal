import { useState, useCallback, useMemo, useEffect } from 'react';
import { Project } from '../models/types';
import { usePlugin } from '../context/PluginContext';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Notice } from 'obsidian';

export interface DirConfig {
  path: string;
  groupId?: string;
}

export interface UseProjectDataOptions {
  /** Whether to load data on mount */
  loadOnMount?: boolean;
}

export interface UseProjectDataResult {
  /** Loaded projects data */
  projects: Project[];
  /** Available groups from plugin settings */
  availableGroups: Array<{ id: string; name: string }>;
  /** Projects filtered by selected group */
  filteredProjects: Project[];
  /** Currently selected group ID */
  selectedGroup: string;
  /** Set selected group ID */
  setSelectedGroup: (groupId: string) => void;
  /** Loading state */
  isLoading: boolean;
  /** Reload data manually */
  loadData: () => Promise<void>;
  /** Handle group change event */
  handleGroupChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Handle refresh button click */
  handleRefresh: () => void;
}

/**
 * Custom hook for loading and managing project data
 * Encapsulates common data loading, filtering, and refresh logic
 */
export const useProjectData = (options: UseProjectDataOptions = {}): UseProjectDataResult => {
  const { loadOnMount = true } = options;

  const pluginContext = usePlugin();
  const app = useApp();
  const plugin = pluginContext?.plugin;
  const refreshKey = pluginContext?.refreshKey ?? 0;
  const refresh = pluginContext?.refresh;
  const selectedGroup = pluginContext?.selectedGroup ?? '';
  const setSelectedGroup = pluginContext?.setSelectedGroup;
  const availableGroups = pluginContext?.availableGroups ?? [];

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!selectedGroup) return projects;
    return projects.filter(project => project.groupId === selectedGroup);
  }, [projects, selectedGroup]);

  const loadData = useCallback(async () => {
    if (!plugin) return;

    setIsLoading(true);

    try {
      const enabledDirs = plugin.settings.projectDirectories
        .filter(d => d.enabled && d.path)
        .map(d => d.path);

      if (enabledDirs.length === 0) {
        new Notice(t('config').setDirectory);
        setIsLoading(false);
        return;
      }

      const loadedProjects = await plugin.getCachedProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      new Notice('Error loading data');
    } finally {
      setIsLoading(false);
    }
  }, [plugin]);

  // Load data on mount and when refreshKey changes
  useEffect(() => {
    if (!loadOnMount) return;

    let isMounted = true;

    const initData = async () => {
      if (!isMounted) return;
      await loadData();
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, [loadData, refreshKey, loadOnMount]);

  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedGroup) {
      setSelectedGroup(e.target.value);
    }
  }, [setSelectedGroup]);

  const handleRefresh = useCallback(async () => {
    if (plugin) {
      await plugin.refreshDataNow();
    }
  }, [plugin]);

  return {
    projects,
    availableGroups,
    filteredProjects,
    selectedGroup,
    setSelectedGroup,
    isLoading,
    loadData,
    handleGroupChange,
    handleRefresh
  };
};
