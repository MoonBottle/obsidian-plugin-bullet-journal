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

  // When groups list changes (e.g. after settings save), reset selection if it is no longer valid
  useEffect(() => {
    const groups = plugin.getProjectGroups();
    const groupIds = new Set(groups.map(g => g.id));
    const defaultGroup = plugin.getDefaultGroup() || '';
    if (selectedGroup && !groupIds.has(selectedGroup)) {
      setSelectedGroupState(defaultGroup);
    }
  }, [plugin, refreshKey]);

  const setSelectedGroup = useCallback((groupId: string) => {
    setSelectedGroupState(groupId);
  }, []);

  // Stable reference for availableGroups: only update when group id/name actually change
  const availableGroupsRef = useRef<GroupOption[]>([]);
  const availableGroups = useMemo(() => {
    const groups = plugin.getProjectGroups();
    const next = groups.map(g => ({ ...g }));
    const prev = availableGroupsRef.current;
    if (prev.length === next.length && next.every((g, i) => prev[i]?.id === g.id && prev[i]?.name === g.name)) {
      return prev;
    }
    availableGroupsRef.current = next;
    return next;
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
