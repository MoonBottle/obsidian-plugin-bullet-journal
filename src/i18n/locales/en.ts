import { Translations } from './zh-cn';

export const en: Translations = {
  // Settings
  settings: {
    title: 'Bullet Journal Assistant Settings',
    projectGroups: {
      title: 'Project Groups',
      description: 'Manage project groups to categorize different types of projects (e.g., Work, Life)',
      addButton: 'Add Group',
      deleteButton: 'Delete',
      emptyMessage: 'No groups configured, click the button below to add',
      namePlaceholder: 'Group Name',
      unnamed: 'Unnamed Group',
      noGroup: 'No Group',
      allGroups: 'All Groups',
      defaultGroupTitle: 'Default Group',
      defaultGroupDesc: 'Default group to select when opening views',
    },
    projectDirectories: {
      title: 'Project Directories',
      description: 'Configure directories to scan for projects',
      emptyMessage: 'No directories configured, click the button below to add',
      addButton: 'Add Directory',
      selectButton: 'Select',
      deleteButton: 'Delete',
      noPath: 'No directory selected',
      dialogTitle: 'Select Project Directory',
    },
    defaultView: {
      title: 'Default View',
      description: 'Default view to open when launching the plugin',
      options: {
        project: 'Project View',
        calendar: 'Calendar View',
        gantt: 'Gantt Chart View',
      },
    },
  },

  // View titles
  views: {
    project: 'Project View',
    calendar: 'Calendar View',
    gantt: 'Gantt Chart View',
    todoSidebar: 'Todo Sidebar',
  },

  // Todo Sidebar
  todoSidebar: {
    title: 'Todo Items',
    today: 'Today',
    tomorrow: 'Tomorrow',
    future: 'Future',
    expired: 'Expired',
    completed: 'Completed',
    abandoned: 'Abandoned',
    allDay: 'All Day',
    noTodos: 'No todo items',
    done: 'Done',
    migrate: 'Migrate to Tomorrow',
    migrateToday: 'Migrate to Today',
    abandon: 'Abandon',
  },

  // Buttons and common text
  common: {
    refresh: 'Refresh',
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    filterByGroup: 'Filter by Group',
  },

  // Calendar view
  calendar: {
    title: 'Calendar View',
    subtitle: 'View daily work items',
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    list: 'List',
    allDay: 'All day',
    noEvents: 'No events',
    noDataDirectory: 'No Data Directory Configured',
    configureDirectory: 'Please configure the Bullet Journal data directory in plugin settings to enable calendar view.',
    refreshData: 'Refresh Data',
    dataRefreshed: 'Data refreshed',
    updateTimeFailed: 'Failed to update time',
    timeUpdated: 'Time updated',
    fileNotFound: 'File not found',
    lineOutOfRange: 'Line number out of range',
    timeFormatNotFound: 'Time format not found',
    cannotUpdate: 'Cannot update: missing file information',
    workItems: 'Work Items',
    noWorkItems: 'No work items for this day',
    project: 'Project',
    task: 'Task',
  },

  // Gantt view
  gantt: {
    title: 'Gantt Chart View',
    task: 'Task',
    taskName: 'Task Name',
    startDate: 'Start Date',
    startTime: 'Start Time',
    endDate: 'End Date',
    endTime: 'End Time',
    duration: 'Duration',
    progress: 'Progress',
    showItems: 'Show Items',
    timeFilter: 'Time',
    to: 'to',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    refreshData: 'Refresh Data',
    dataRefreshed: 'Data refreshed',
  },

  // Project view
  project: {
    title: 'Project Management',
    subtitle: 'View and manage all projects',
    noProjects: 'No projects found. Please check your data directory.',
    noTasks: 'No tasks found.',
    taskCount: 'Tasks',
    ganttChart: 'Gantt Chart',
    level: 'Level',
    date: 'Date',
    link: 'Link',
    workItems: 'Work Items',
    projectLinks: 'Project Links',
    refreshData: 'Refresh Data',
    dataRefreshed: 'Data refreshed',
  },

  // Event modal
  eventModal: {
    title: 'Event Details',
    project: 'Project',
    task: 'Task',
    date: 'Date',
    description: 'Description',
    openFile: 'Open File',
    copy: 'Copy',
    copied: 'Copied',
  },

  // Config hints
  config: {
    setDirectory: 'Please set at least one project directory in plugin settings',
  },

  // Context menu
  contextMenu: {
    complete: 'Complete',
    abandon: 'Abandon',
    migrate: 'Migrate',
    migrateToday: 'Today',
    migrateTomorrow: 'Tomorrow',
    migrateCustom: 'Choose date...',
    openDoc: 'Open Document',
    showDetail: 'View Detail',
    showCalendar: 'View Calendar',
  },

  // More menu
  moreMenu: {
    refresh: 'Refresh',
    hideCompleted: 'Hide Completed',
    showCompleted: 'Show Completed',
    hideAbandoned: 'Hide Abandoned',
    showAbandoned: 'Show Abandoned',
  },
};
