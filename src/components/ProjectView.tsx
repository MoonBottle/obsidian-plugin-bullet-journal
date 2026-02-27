import { useState, useCallback, useMemo, memo } from 'react';
import { usePlugin } from '../context/PluginContext';
import { Project, Task } from '../models/types';
import { t } from '../i18n';
import { useProjectData } from '../hooks/useProjectData';
import { GroupSelect, RefreshButton, ViewHeader } from './shared';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

const ProjectList = memo(({ projects, onSelectProject }: ProjectListProps) => {
  if (projects.length === 0) {
    return <p>{t('project').noProjects}</p>;
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <ProjectItem
          key={project.name}
          project={project}
          onClick={onSelectProject}
        />
      ))}
    </div>
  );
});

ProjectList.displayName = 'ProjectList';

interface ProjectItemProps {
  project: Project;
  onClick: (project: Project) => void;
}

const ProjectItem = memo(({ project, onClick }: ProjectItemProps) => {
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    onClick(project);
  }, [onClick, project]);

  // Get display name with directory path for disambiguation
  const displayName = project.directoryPath
    ? `${project.name} (${project.directoryPath})`
    : project.name;

  return (
    <div
      className="project-item"
      onClick={handleClick}
    >
      <h3>{displayName}</h3>
      <div className="project-meta">
        <span>{t('project').taskCount}: {project.tasks.length}</span>
        {project.ganttUrl && (
          <>
            <span> • </span>
            <a
              href={project.ganttUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
            >
              {t('project').ganttChart}
            </a>
          </>
        )}
      </div>
    </div>
  );
});

ProjectItem.displayName = 'ProjectItem';

interface TaskItemProps {
  task: Task;
}

const TaskItem = memo(({ task }: TaskItemProps) => {
  return (
    <div className={`task-item ${task.level.toLowerCase()}`}>
      <h4>{task.name}</h4>
      <div className="task-meta">
        <span>{t('project').level}: {task.level}</span>
        {task.date && <span> • {t('project').date}: {task.date}</span>}
        {task.link && (
          <>
            <span> • </span>
            <a href={task.link} target="_blank" rel="noopener noreferrer">
              {t('project').link}
            </a>
          </>
        )}
      </div>

      {task.items.length > 0 && (
        <ul>
          {task.items.map((item, index) => (
            <li key={index}>
              <span>[{item.date}] {item.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetails = ({ project, onBack }: ProjectDetailsProps) => {
  const taskList = useMemo(() => {
    if (project.tasks.length === 0) {
      return <p>{t('project').noTasks}</p>;
    }
    return project.tasks.map((task) => <TaskItem key={task.name} task={task} />);
  }, [project.tasks]);

  return (
    <div className="hk-work-container">
      <div className="hk-work-header">
        <button onClick={onBack}>← {t('common').back}</button>
        <h2 className="hk-work-title">{project.name}</h2>
      </div>

      {project.description && <p>{project.description}</p>}

      {project.links && project.links.length > 0 && (
        <div>
          <h3>{t('project').projectLinks}</h3>
          <ul>
            {project.links.map((link) => (
              <li key={link.name}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3>{t('project').workItems}</h3>
        <div className="task-list">
          {taskList}
        </div>
      </div>
    </div>
  );
};

export const ProjectViewComponent = () => {
  const {
    availableGroups,
    filteredProjects,
    selectedGroup,
    isLoading,
    handleGroupChange,
    handleRefresh
  } = useProjectData();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedProject(null);
  }, []);

  const onRefresh = useCallback(() => {
    handleRefresh(t('project').dataRefreshed);
  }, [handleRefresh]);

  if (selectedProject) {
    return (
      <ProjectDetails
        project={selectedProject}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="hk-work-container">
      <ViewHeader
        title={t('project').title}
        subtitle={t('project').subtitle}
        actions={
          <>
            <GroupSelect
              groups={availableGroups}
              value={selectedGroup}
              onChange={handleGroupChange}
            />
            <RefreshButton
              onClick={onRefresh}
              isLoading={isLoading}
              text={t('common').refresh}
              title={t('project').refreshData}
            />
          </>
        }
      />

      <ProjectList
        projects={filteredProjects}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
};
