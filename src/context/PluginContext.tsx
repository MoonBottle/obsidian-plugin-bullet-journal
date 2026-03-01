import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo, useRef } from 'react';
import BulletJournalPlugin from '../../main';

export interface GroupOption {
  id: string;
  name: string;
}

interface PluginContextType {
  plugin: BulletJournalPlugin | undefined;
  refreshKey: number;
  refresh: () => void;
  selectedGroup: string;
  setSelectedGroup: (groupId: string) => void;
  getGroupName: (groupId: string) => string;
  availableGroups: GroupOption[];
}

export const PluginContext = createContext<PluginContextType | undefined>(undefined);

interface PluginProviderProps {
  plugin: BulletJournalPlugin;
  children: ReactNode;
}

export const PluginProvider = ({ plugin, children }: PluginProviderProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  // Initialize selectedGroup with default group from settings
  const [selectedGroup, setSelectedGroupState] = useState<string>(() => {
    return plugin.getDefaultGroup() || '';
  });

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Update selected group when default group changes in settings
  useEffect(() => {
    const defaultGroup = plugin.getDefaultGroup();
    if (defaultGroup && defaultGroup !== selectedGroup) {
      setSelectedGroupState(defaultGroup);
    }
  }, [plugin, refreshKey]);

  const setSelectedGroup = useCallback((groupId: string) => {
    setSelectedGroupState(groupId);
  }, []);

  // Use Map to optimize repeated lookups
  const availableGroups = useMemo(() => {
    // Create a new array copy to ensure React detects the change
    // when settings are modified in the settings tab
    const groups = plugin.getProjectGroups();
    return groups.map(g => ({ ...g }));
  }, [plugin, refreshKey]);

  const groupMap = useMemo(() => {
    return new Map(availableGroups.map(g => [g.id, g.name]));
  }, [availableGroups]);

  const getGroupName = useCallback((groupId: string): string => {
    if (!groupId) return '';
    return groupMap.get(groupId) || '';
  }, [groupMap]);

  // Register refresh callback to plugin when component mounts
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const unsubscribe = plugin.onRefresh(() => {
      refreshRef.current();
    });

    return () => {
      unsubscribe();
    };
  }, [plugin]);

  const value = useMemo(() => ({
    plugin,
    refreshKey,
    refresh,
    selectedGroup,
    setSelectedGroup,
    getGroupName,
    availableGroups
  }), [plugin, refreshKey, refresh, selectedGroup, setSelectedGroup, getGroupName, availableGroups]);

  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugin = (): PluginContextType | undefined => {
  return useContext(PluginContext);
};
