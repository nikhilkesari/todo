import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from './Header';
import { ProjectSidebar } from '../projects/ProjectSidebar';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { TaskList } from '../tasks/TaskList';
import { EditTaskModal } from '../tasks/EditTaskModal';
import { AddProjectModal } from '../projects/AddProjectModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { VoiceTaskModal } from '../voice/VoiceTaskModal';
import { TaskSortBy } from '../../types';

import { SlidersHorizontal } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const {
    selectedProjectId,
    projects,
    quickFilter,
    filteredTasks,
    sortBy,
    setSortBy,
    hideCompleted,
    setHideCompleted,
    isLoading,
  } = useApp();

  const currentTitle = React.useMemo(() => {
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      return proj ? proj.name : 'Project';
    }
    switch (quickFilter) {
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'overdue':
        return 'Overdue';
      case 'completed':
        return 'Completed';
      case 'all':
      default:
        return 'All Tasks';
    }
  }, [selectedProjectId, projects, quickFilter]);

  return (
    <div data-testid="app-root" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <ProjectSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Main View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>

            {/* View Controls: Sort & Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Hide Completed toggle */}
              {quickFilter !== 'completed' && (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Hide completed</span>
                </label>
              )}

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as TaskSortBy)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="dueDate-asc">Due Date (Earliest)</option>
                  <option value="dueDate-desc">Due Date (Latest)</option>
                  <option value="priority-desc">Priority (High to Low)</option>
                  <option value="alphabetical">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Add Bar */}
          <QuickAddTask />

          {/* Task List */}
          <div data-testid="tasks-container">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center text-slate-400 text-sm">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
                Loading tasks...
              </div>
            ) : (
              <TaskList />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <EditTaskModal />
      <AddProjectModal />
      <AIAssistantDrawer />
      <VoiceTaskModal />
    </div>
  );
};

