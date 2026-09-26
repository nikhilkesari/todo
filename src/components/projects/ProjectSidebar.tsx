import React from 'react';
import { useApp } from '../../context/AppContext';
import { QuickFilter } from '../../types';
import {
  Inbox,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface QuickFilterItem {
  id: QuickFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  badgeClass?: string;
}

const QUICK_FILTERS: QuickFilterItem[] = [
  { id: 'all', label: 'All Tasks', icon: Inbox, countKey: 'all' },
  { id: 'today', label: 'Today', icon: Calendar, countKey: 'today', badgeClass: 'bg-indigo-100 text-indigo-700' },
  { id: 'upcoming', label: 'Upcoming', icon: Clock, countKey: 'upcoming' },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle, countKey: 'overdue', badgeClass: 'bg-red-100 text-red-700 font-bold' },
  { id: 'completed', label: 'Completed', icon: CheckCircle2, countKey: 'completed' },
];

export const ProjectSidebar: React.FC = () => {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    quickFilter,
    setQuickFilter,
    taskCounts,
    projectCounts,
    setIsProjectModalOpen,
    deleteProject,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useApp();

  const handleFilterClick = (filterId: QuickFilter) => {
    setQuickFilter(filterId);
    setSelectedProjectId(null);
    setIsSidebarOpen(false);
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setQuickFilter('all');
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed lg:static top-0 bottom-0 left-0 z-40 w-64 sm:w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <span className="font-semibold text-slate-800">Menu</span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Filters */}
          <div>
            <h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overview
            </h3>
            <div className="space-y-1">
              {QUICK_FILTERS.map((item) => {
                const Icon = item.icon;
                const isActive = selectedProjectId === null && quickFilter === item.id;
                const count = taskCounts[item.countKey];

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`filter-${item.id}`}
                    onClick={() => handleFilterClick(item.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-brand-600' : 'text-slate-400')} />
                      <span>{item.label}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold',
                          item.badgeClass
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projects / Lists */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Lists & Projects
              </h3>
              <button
                type="button"
                data-testid="add-project-btn"
                onClick={() => setIsProjectModalOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Add new list"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {projects.map((project) => {
                const isActive = selectedProjectId === project.id;
                const count = projectCounts[project.id] || 0;

                return (
                  <div
                    key={project.id}
                    data-testid={`project-item-${project.id}`}
                    className={cn(
                      'group w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate">{project.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {count > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {count}
                        </span>
                      )}

                      {!project.isDefault && (
                        <button
                          type="button"
                          aria-label={`Delete list ${project.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${project.name}"? Tasks will be moved to Inbox.`)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          TaskFlow AI • Local-First
        </div>
      </aside>
    </>
  );
};
