export const zhCN = {
  // 设置界面
  settings: {
    title: '子弹笔记助手设置',
    projectGroups: {
      title: '项目分组',
      description: '管理项目分组，用于区分不同类型的项目（如工作、生活）',
      addButton: '添加分组',
      deleteButton: '删除',
      emptyMessage: '暂无分组，点击下方按钮添加',
      namePlaceholder: '分组名称',
      unnamed: '未命名分组',
      noGroup: '未分组',
      allGroups: '所有分组',
      defaultGroupTitle: '默认分组',
      defaultGroupDesc: '打开视图时默认选中的分组',
    },
    projectDirectories: {
      title: '项目目录',
      description: '在文件树中右键点击文件夹，选择"添加为项目目录"来配置',
      emptyMessage: '暂无配置的目录，请在文件树中右键点击文件夹添加',
      addButton: '添加目录',
      selectButton: '选择',
      deleteButton: '删除',
      noPath: '未选择目录',
      dialogTitle: '选择项目目录',
    },
    lunchBreak: {
      title: '午休时间',
      description: '设置午休时间段，计算工作耗时时会自动减去午休时间',
      start: {
        title: '午休开始时间',
        description: '格式：HH:mm（例如：12:00）',
      },
      end: {
        title: '午休结束时间',
        description: '格式：HH:mm（例如：13:00）',
      },
    },
  },

  // 视图标题
  views: {
    project: '项目视图',
    calendar: '日历视图',
    gantt: '甘特图视图',
    todoSidebar: '待办侧栏',
  },

  // 待办侧栏
  todoSidebar: {
    title: '待办事项',
    today: '今天',
    tomorrow: '明天',
    future: '未来',
    expired: '已过期',
    completed: '已完成',
    abandoned: '已放弃',
    allDay: '全天',
    noTodos: '暂无待办事项',
    done: '完成',
    migrate: '迁移到明天',
    migrateToday: '迁移到今天',
    abandon: '放弃',
  },

  // 按钮和通用文本
  common: {
    refresh: '刷新',
    loading: '加载中...',
    error: '错误',
    cancel: '取消',
    save: '保存',
    confirm: '确认',
    close: '关闭',
    back: '返回',
    filterByGroup: '筛选分组',
    dataRefreshed: '数据已刷新',
  },

  // 日历视图
  calendar: {
    title: '日历视图',
    subtitle: '查看每天的工作事项',
    today: '今天',
    month: '月',
    week: '周',
    day: '日',
    list: '列表',
    allDay: '全天',
    noEvents: '暂无事件',
    noDataDirectory: '未配置数据目录',
    configureDirectory: '请在插件设置中配置子弹笔记数据目录以启用日历视图。',
    refreshData: '刷新数据',
    updateTimeFailed: '更新时间失败',
    timeUpdated: '时间已更新',
    fileNotFound: '文件不存在',
    lineOutOfRange: '行号超出范围',
    timeFormatNotFound: '未找到可替换的时间格式',
    cannotUpdate: '无法更新：缺少文件信息',
    workItems: '的工作事项',
    noWorkItems: '当天没有工作事项',
    project: '项目',
    task: '任务',
  },

  // 甘特图视图
  gantt: {
    title: '甘特图视图',
    task: '任务',
    taskName: '任务名称',
    startDate: '开始日期',
    startTime: '开始时间',
    endDate: '结束日期',
    endTime: '结束时间',
    duration: '持续时间',
    progress: '进度',
    showItems: '显示事项',
    timeFilter: '时间',
    to: '至',
    day: '日',
    week: '周',
    month: '月',
    refreshData: '刷新数据',
  },

  // 项目视图
  project: {
    title: '项目管理',
    subtitle: '查看和管理所有项目',
    noProjects: '未找到项目。请检查您的数据目录。',
    noTasks: '未找到任务。',
    taskCount: '任务数',
    ganttChart: '甘特图',
    level: '级别',
    date: '日期',
    link: '链接',
    workItems: '工作任务',
    projectLinks: '项目链接',
    refreshData: '刷新数据',
  },

  // 事件详情弹窗
  eventModal: {
    title: '事件详情',
    project: '项目',
    task: '任务',
    date: '日期',
    description: '描述',
    openFile: '打开文件',
    copy: '复制',
    copied: '已复制',
  },

  // 配置提示
  config: {
    setDirectory: '请在插件设置中配置至少一个项目目录',
    setDirectoryOrTag: '请配置项目目录，或确保笔记中包含 #任务 / #task 标签',
  },

  // 文件菜单
  fileMenu: {
    addAsProjectDirectory: '添加为项目目录',
    alreadyExists: '该目录已存在于配置中',
    addSuccess: '已添加为项目目录',
  },

  // 右键菜单
  contextMenu: {
    complete: '完成',
    abandon: '放弃',
    migrate: '迁移',
    migrateToday: '今天',
    migrateTomorrow: '明天',
    migrateCustom: '选择日期...',
    openDoc: '打开文档',
    showDetail: '查看详情',
    showCalendar: '查看日历',
  },

  // 更多菜单
  moreMenu: {
    refresh: '刷新',
    hideCompleted: '隐藏已完成',
    showCompleted: '显示已完成',
    hideAbandoned: '隐藏已放弃',
    showAbandoned: '显示已放弃',
  },
};

export type Translations = typeof zhCN;
