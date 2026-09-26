import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Task, Project, TaskCreateInput, TaskUpdateInput, ProjectCreateInput, QuickFilter, TaskSortBy } from '../types';
import { getDatabase } from '../db/database';
import { seedInitialData } from '../db/seed';
import { taskRepository } from '../db/taskRepository';
import { projectRepository } from '../db/projectRepository';
import { checkIsToday, checkIsUpcoming, checkIsOverdue } from '../utils/dateUtils';

interface AppContextType {
  tasks: Task[];
  projects: Project[];
  selectedProjectId: string | null;
  quickFilter: QuickFilter;
  searchQuery: string;
  sortBy: TaskSortBy;
  hideCompleted: boolean;
  isLoading: boolean;
  error: string | null;

  // Modals & Drawers
  editingTask: Task | null;
  isCreateModalOpen: boolean;
  isProjectModalOpen: boolean;
  isSidebarOpen: boolean;
  isAIDrawerOpen: boolean;

  // Actions
  addTask: (input: TaskCreateInput) => Promise<Task>;
  updateTask: (input: TaskUpdateInput) => Promise<Task>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  batchReschedule: (suggestions: Array<{ taskId: string; newDueDate: string }>) => Promise<void>;
  addProject: (input: ProjectCreateInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  setQuickFilter: (filter: QuickFilter) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: TaskSortBy) => void;
  setHideCompleted: (hide: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsProjectModalOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsAIDrawerOpen: (open: boolean) => void;

  // Computed
  filteredTasks: Task[];
  taskCounts: {
    all: number;
    today: number;
    upcoming: number;
    overdue: number;
    completed: number;
  };
  projectCounts: Record<string, number>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TaskSortBy>('createdAt-desc');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);

  // Initialize DB and load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const db = await getDatabase();
      await seedInitialData(db);

      const [loadedProjects, loadedTasks] = await Promise.all([
        projectRepository.getAll(),
        taskRepository.getAll(),
      ]);

      setProjects(loadedProjects);
      setTasks(loadedTasks);
    } catch (err: unknown) {
      console.error('Failed to load IndexedDB data:', err);
      setError(err instanceof Error ? err.message : 'Unknown database error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistic Add Task
  const addTask = useCallback(
    async (input: TaskCreateInput): Promise<Task> => {
      const tempId = input.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const optimisticTask: Task = {
        id: tempId,
        title: input.title.trim(),
        description: input.description?.trim(),
        completed: input.completed ?? false,
        dueDate: input.dueDate || undefined,
        projectId: input.projectId || selectedProjectId || 'inbox',
        priority: input.priority || 'medium',
        complexity: input.complexity || 'low',
        estimatedMinutes: input.estimatedMinutes,
        createdAt: now,
        updatedAt: now,
      };

      // Optimistically add to state
      setTasks((prev) => [optimisticTask, ...prev]);

      try {
        const persistedTask = await taskRepository.create({
          ...input,
          id: tempId,
          projectId: optimisticTask.projectId,
        });
        // Update with persisted entity
        setTasks((prev) => prev.map((t) => (t.id === tempId ? persistedTask : t)));
        return persistedTask;
      } catch (err: unknown) {
        // Rollback on error
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        throw err;
      }
    },
    [selectedProjectId]
  );

  // Optimistic Update Task
  const updateTask = useCallback(async (input: TaskUpdateInput): Promise<Task> => {
    let originalTask: Task | undefined;

    setTasks((prev) => {
      originalTask = prev.find((t) => t.id === input.id);
      if (!originalTask) return prev;
      return prev.map((t) =>
        t.id === input.id
          ? {
              ...t,
              ...input,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
    });

    try {
      const persisted = await taskRepository.update(input);
      setTasks((prev) => prev.map((t) => (t.id === persisted.id ? persisted : t)));
      return persisted;
    } catch (err: unknown) {
      // Rollback
      if (originalTask) {
        setTasks((prev) => prev.map((t) => (t.id === input.id ? originalTask! : t)));
      }
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      throw err;
    }
  }, []);

  // Optimistic Toggle Task
  const toggleTask = useCallback(async (id: string): Promise<void> => {
    let originalTask: Task | undefined;

    setTasks((prev) => {
      originalTask = prev.find((t) => t.id === id);
      if (!originalTask) return prev;
      return prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    });

    try {
      const persisted = await taskRepository.toggleComplete(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? persisted : t)));
    } catch (err: unknown) {
      if (originalTask) {
        setTasks((prev) => prev.map((t) => (t.id === id ? originalTask! : t)));
      }
      const message = err instanceof Error ? err.message : 'Failed to toggle task';
      setError(message);
      throw err;
    }
  }, []);

  // Optimistic Delete Task
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    let deletedTask: Task | undefined;
    let deletedIndex = -1;

    setTasks((prev) => {
      deletedIndex = prev.findIndex((t) => t.id === id);
      if (deletedIndex !== -1) {
        deletedTask = prev[deletedIndex];
        return prev.filter((t) => t.id !== id);
      }
      return prev;
    });

    try {
      await taskRepository.delete(id);
    } catch (err: unknown) {
      if (deletedTask && deletedIndex !== -1) {
        setTasks((prev) => {
          const next = [...prev];
          next.splice(deletedIndex, 0, deletedTask!);
          return next;
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      throw err;
    }
  }, []);

  // Optimistic Batch Reschedule
  const batchReschedule = useCallback(
    async (suggestions: Array<{ taskId: string; newDueDate: string }>): Promise<void> => {
      const previousTasks = [...tasks];
      const suggestionMap = new Map(suggestions.map((s) => [s.taskId, s.newDueDate]));

      setTasks((prev) =>
        prev.map((t) => {
          const newDate = suggestionMap.get(t.id);
          if (newDate !== undefined) {
            return { ...t, dueDate: newDate, updatedAt: new Date().toISOString() };
          }
          return t;
        })
      );

      try {
        const updated = await taskRepository.batchReschedule(suggestions);
        const updatedMap = new Map(updated.map((t) => [t.id, t]));
        setTasks((prev) => prev.map((t) => updatedMap.get(t.id) || t));
      } catch (err: unknown) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : 'Failed to batch reschedule tasks';
        setError(message);
        throw err;
      }
    },
    [tasks]
  );

  // Add Project
  const addProject = useCallback(async (input: ProjectCreateInput): Promise<Project> => {
    try {
      const newProject = await projectRepository.create(input);
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      throw err;
    }
  }, []);

  // Delete Project
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      try {
        await projectRepository.delete(id);
        // Refresh projects and tasks (reassigned to inbox)
        const [loadedProjects, loadedTasks] = await Promise.all([
          projectRepository.getAll(),
          taskRepository.getAll(),
        ]);
        setProjects(loadedProjects);
        setTasks(loadedTasks);
        if (selectedProjectId === id) {
          setSelectedProjectId(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete project';
        setError(message);
        throw err;
      }
    },
    [selectedProjectId]
  );

  // Task Counts
  const taskCounts = useMemo(() => {
    let all = 0;
    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    let completed = 0;

    for (const t of tasks) {
      all++;
      if (t.completed) {
        completed++;
      } else {
        if (checkIsToday(t.dueDate)) today++;
        else if (checkIsUpcoming(t.dueDate)) upcoming++;
        else if (checkIsOverdue(t.dueDate)) overdue++;
      }
    }

    return { all, today, upcoming, overdue, completed };
  }, [tasks]);

  // Project Task Counts (active tasks per project)
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.id] = 0;
    }
    for (const t of tasks) {
      if (!t.completed && counts[t.projectId] !== undefined) {
        counts[t.projectId]++;
      }
    }
    return counts;
  }, [projects, tasks]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q) ?? false;
          if (!matchTitle && !matchDesc) return false;
        }

        // Project filter
        if (selectedProjectId && task.projectId !== selectedProjectId) {
          return false;
        }

        // Quick filter
        switch (quickFilter) {
          case 'today':
            if (!checkIsToday(task.dueDate)) return false;
            break;
          case 'upcoming':
            if (!checkIsUpcoming(task.dueDate)) return false;
            break;
          case 'overdue':
            if (!checkIsOverdue(task.dueDate) || task.completed) return false;
            break;
          case 'completed':
            if (!task.completed) return false;
            break;
          case 'all':
          default:
            break;
        }

        if (hideCompleted && task.completed && quickFilter !== 'completed') {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // In mixed views, sort active before completed unless sorting specifically
        if (quickFilter !== 'completed' && a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        switch (sortBy) {
          case 'dueDate-asc':
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
          case 'dueDate-desc':
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return b.dueDate.localeCompare(a.dueDate);
          case 'priority-desc': {
            const weights: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return weights[b.priority] - weights[a.priority];
          }
          case 'alphabetical':
            return a.title.localeCompare(b.title);
          case 'createdAt-desc':
          default:
            return b.createdAt.localeCompare(a.createdAt);
        }
      });
  }, [tasks, searchQuery, selectedProjectId, quickFilter, hideCompleted, sortBy]);

  const value = {
    tasks,
    projects,
    selectedProjectId,
    quickFilter,
    searchQuery,
    sortBy,
    hideCompleted,
    isLoading,
    error,
    editingTask,
    isCreateModalOpen,
    isProjectModalOpen,
    isSidebarOpen,
    isAIDrawerOpen,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    batchReschedule,
    addProject,
    deleteProject,
    setQuickFilter,
    setSelectedProjectId,
    setSearchQuery,
    setSortBy,
    setHideCompleted,
    setEditingTask,
    setIsCreateModalOpen,
    setIsProjectModalOpen,
    setIsSidebarOpen,
    setIsAIDrawerOpen,
    filteredTasks,
    taskCounts,
    projectCounts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
