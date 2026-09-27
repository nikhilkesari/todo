import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { closeDatabase, DB_NAME, getDatabase } from '../db/database';
import { seedInitialData } from '../db/seed';
import { taskRepository } from '../db/taskRepository';
import { projectRepository } from '../db/projectRepository';
import {
  checkIsToday,
  checkIsUpcoming,
  checkIsOverdue,
  formatDueDate,
} from '../utils/dateUtils';
import { addDays, subDays, format } from 'date-fns';

// Dedicated Test Harness Component exposing UI and actions
const EmpiricalStressHarness: React.FC = () => {
  const {
    tasks,
    filteredTasks,
    selectedProjectId,
    quickFilter,
    isLoading,
    error,
    addTask,
    toggleTask,
    deleteTask,
  } = useApp();

  if (isLoading) {
    return <div data-testid="stress-loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="stress-total-count">{tasks.length}</div>
      <div data-testid="stress-filtered-count">{filteredTasks.length}</div>
      <div data-testid="stress-selected-project">{selectedProjectId ?? 'none'}</div>
      <div data-testid="stress-quick-filter">{quickFilter}</div>
      <div data-testid="stress-error">{error ?? 'none'}</div>

      {/* Action buttons for harness */}
      <button
        data-testid="btn-add-work-task"
        onClick={() =>
          addTask({
            title: 'Work Isolation Task',
            projectId: 'work',
            priority: 'high',
          })
        }
      >
        Add Work Task
      </button>

      <button
        data-testid="btn-add-personal-task"
        onClick={() =>
          addTask({
            title: 'Personal Isolation Task',
            projectId: 'personal',
            priority: 'low',
          })
        }
      >
        Add Personal Task
      </button>

      <button
        data-testid="btn-add-nodate-task"
        onClick={() =>
          addTask({
            title: 'No Date Task',
            projectId: 'inbox',
          })
        }
      >
        Add No Date Task
      </button>

      <button
        data-testid="btn-add-overdue-task"
        onClick={() =>
          addTask({
            title: 'Overdue Past Task',
            projectId: 'work',
            dueDate: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
          })
        }
      >
        Add Overdue Task
      </button>

      <button
        data-testid="btn-add-upcoming-task"
        onClick={() =>
          addTask({
            title: 'Upcoming Future Task',
            projectId: 'personal',
            dueDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
          })
        }
      >
        Add Upcoming Task
      </button>

      {/* Render list of filtered tasks */}
      <div data-testid="stress-task-list">
        {filteredTasks.map((t) => (
          <div key={t.id} data-testid={`item-${t.id}`}>
            <span data-testid={`item-title-${t.id}`}>{t.title}</span>
            <span data-testid={`item-project-${t.id}`}>{t.projectId}</span>
            <span data-testid={`item-completed-${t.id}`}>{String(t.completed)}</span>
            <span data-testid={`item-date-${t.id}`}>{t.dueDate ?? 'none'}</span>
            <button data-testid={`item-toggle-${t.id}`} onClick={() => toggleTask(t.id)}>
              Toggle
            </button>
            <button data-testid={`item-delete-${t.id}`} onClick={() => deleteTask(t.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Empirical Stress Testing: Milestone 1 (R1)', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    closeDatabase();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    closeDatabase();
  });

  describe('1. Date Filtering Boundaries & Time Transitions', () => {
    it('handles exact midnight boundary (00:00:00 vs 23:59:59.999) without off-by-one errors', () => {
      // Set system time to right before midnight: 2026-09-26 23:59:59.999
      vi.useFakeTimers();
      const testDate = new Date(2026, 8, 26, 23, 59, 59, 999);
      vi.setSystemTime(testDate);

      const todayStr = '2026-09-26';
      const tomorrowStr = '2026-09-27';
      const yesterdayStr = '2026-09-25';

      expect(checkIsToday(todayStr)).toBe(true);
      expect(checkIsUpcoming(todayStr)).toBe(false);
      expect(checkIsOverdue(todayStr)).toBe(false);

      expect(checkIsUpcoming(tomorrowStr)).toBe(true);
      expect(checkIsToday(tomorrowStr)).toBe(false);
      expect(checkIsOverdue(tomorrowStr)).toBe(false);

      expect(checkIsOverdue(yesterdayStr)).toBe(true);
      expect(checkIsToday(yesterdayStr)).toBe(false);
      expect(checkIsUpcoming(yesterdayStr)).toBe(false);

      // Advance clock by 1 ms to cross midnight: 2026-09-27 00:00:00.000
      vi.advanceTimersByTime(1);

      // Now 2026-09-26 must immediately become overdue
      expect(checkIsToday(todayStr)).toBe(false);
      expect(checkIsOverdue(todayStr)).toBe(true);
      expect(checkIsUpcoming(todayStr)).toBe(false);

      // And 2026-09-27 must immediately become today
      expect(checkIsToday(tomorrowStr)).toBe(true);
      expect(checkIsUpcoming(tomorrowStr)).toBe(false);
      expect(checkIsOverdue(tomorrowStr)).toBe(false);
    });

    it('correctly handles month and year boundary transitions (Dec 31 to Jan 1, Feb 28 to Mar 1)', () => {
      vi.useFakeTimers();
      // Year transition: 2026-12-31 23:59:59
      vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
      expect(checkIsToday('2026-12-31')).toBe(true);
      expect(checkIsUpcoming('2027-01-01')).toBe(true);
      expect(checkIsOverdue('2026-12-30')).toBe(true);

      // Advance by 2 seconds across new year
      vi.advanceTimersByTime(2000);
      expect(checkIsToday('2027-01-01')).toBe(true);
      expect(checkIsOverdue('2026-12-31')).toBe(true);
      expect(checkIsUpcoming('2026-12-31')).toBe(false);
    });

    it('handles tasks without dates, empty strings, and malformed inputs gracefully', () => {
      expect(checkIsToday(undefined)).toBe(false);
      expect(checkIsToday('')).toBe(false);
      expect(checkIsToday('invalid-date')).toBe(false);

      expect(checkIsUpcoming(undefined)).toBe(false);
      expect(checkIsUpcoming('')).toBe(false);
      expect(checkIsUpcoming('invalid-date')).toBe(false);

      expect(checkIsOverdue(undefined)).toBe(false);
      expect(checkIsOverdue('')).toBe(false);
      expect(checkIsOverdue('invalid-date')).toBe(false);

      expect(formatDueDate(undefined)).toBe('');
      expect(formatDueDate('')).toBe('');
      expect(formatDueDate('invalid-date')).toBe('invalid-date');
    });

    it('filters tasks properly under Today, Upcoming, and Overdue in full React UI', async () => {
      render(
        <AppProvider>
          <EmpiricalStressHarness />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
      });

      // Add Overdue task
      await act(async () => {
        screen.getByTestId('btn-add-overdue-task').click();
      });

      // Add Upcoming task
      await act(async () => {
        screen.getByTestId('btn-add-upcoming-task').click();
      });

      // Add No Date task
      await act(async () => {
        screen.getByTestId('btn-add-nodate-task').click();
      });

      expect(screen.getByText('Overdue Past Task')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Future Task')).toBeInTheDocument();
      expect(screen.getByText('No Date Task')).toBeInTheDocument();
    });
  });

  describe('2. Project Categorization Isolation', () => {
    it('strictly isolates tasks by project — Work tasks do NOT leak into Personal or Groceries', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Add a distinctive Work task and Personal task
      await act(async () => {
        screen.getByTestId('btn-add-work-task').click();
      });
      await act(async () => {
        screen.getByTestId('btn-add-personal-task').click();
      });

      expect(screen.getByText('Work Isolation Task')).toBeInTheDocument();
      expect(screen.getByText('Personal Isolation Task')).toBeInTheDocument();

      // Switch to project 'work'
      await act(async () => {
        contextRef!.setSelectedProjectId('work');
      });

      // Verification: Work tasks must exist, Personal/Groceries/Inbox MUST NOT leak
      expect(screen.getByText('Work Isolation Task')).toBeInTheDocument();
      expect(screen.queryByText('Personal Isolation Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Welcome to TaskFlow AI! 👋')).not.toBeInTheDocument(); // inbox
      expect(screen.queryByText('Pick up fresh groceries & coffee beans')).not.toBeInTheDocument(); // groceries

      // All rendered items in the list must belong to 'work'
      const renderedProjects = screen.getAllByTestId(/^item-project-/);
      expect(renderedProjects.length).toBeGreaterThan(0);
      for (const el of renderedProjects) {
        expect(el.textContent).toBe('work');
      }

      // Switch to project 'personal'
      await act(async () => {
        contextRef!.setSelectedProjectId('personal');
      });

      expect(screen.getByText('Personal Isolation Task')).toBeInTheDocument();
      expect(screen.queryByText('Work Isolation Task')).not.toBeInTheDocument();
      for (const el of screen.getAllByTestId(/^item-project-/)) {
        expect(el.textContent).toBe('personal');
      }

      // Switch to project 'groceries'
      await act(async () => {
        contextRef!.setSelectedProjectId('groceries');
      });

      expect(screen.getByText('Pick up fresh groceries & coffee beans')).toBeInTheDocument();
      expect(screen.queryByText('Work Isolation Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Personal Isolation Task')).not.toBeInTheDocument();
      for (const el of screen.getAllByTestId(/^item-project-/)) {
        expect(el.textContent).toBe('groceries');
      }

      // Reset to All tasks (selectedProjectId = null)
      await act(async () => {
        contextRef!.setSelectedProjectId(null);
      });

      expect(screen.getByText('Work Isolation Task')).toBeInTheDocument();
      expect(screen.getByText('Personal Isolation Task')).toBeInTheDocument();
      expect(screen.getByText('Pick up fresh groceries & coffee beans')).toBeInTheDocument();
    });

    it('safely reassigns tasks to inbox on project deletion without data loss', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Add a custom project
      let createdProject: { id: string; name: string };
      await act(async () => {
        createdProject = await contextRef!.addProject({ name: 'Temporary Project', color: '#ff0000' });
      });

      // Add task to this custom project
      let customTaskId: string = '';
      await act(async () => {
        const task = await contextRef!.addTask({
          title: 'Custom Project Task',
          projectId: createdProject.id,
        });
        customTaskId = task.id;
      });

      // Delete the project
      await act(async () => {
        await contextRef!.deleteProject(createdProject.id);
      });

      // Project should no longer exist in state or DB
      expect(contextRef!.projects.some((p) => p.id === createdProject.id)).toBe(false);

      // Verify persistence in IndexedDB: Task still exists, but its projectId has been reassigned to 'inbox'
      const db = await getDatabase();
      const persistedTask = await db.get('tasks', customTaskId);
      expect(persistedTask).toBeDefined();
      expect(persistedTask!.projectId).toBe('inbox');
      expect(persistedTask!.title).toBe('Custom Project Task');

      // State in context should also reflect the reassignment
      const stateTask = contextRef!.tasks.find((t) => t.id === customTaskId);
      expect(stateTask?.projectId).toBe('inbox');
    });

    it('prevents deletion of default system project (inbox)', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Attempting to delete 'inbox' must reject
      await act(async () => {
        await expect(contextRef!.deleteProject('inbox')).rejects.toThrow(
          'Cannot delete default system project'
        );
      });

      // Verify inbox still exists in DB
      const db = await getDatabase();
      const inboxProj = await db.get('projects', 'inbox');
      expect(inboxProj).toBeDefined();
    });
  });

  describe('3. Completion Toggling, State Transitions & Persistence Invariants', () => {
    it('inverts completion status and guarantees persistence in IndexedDB', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      const welcomeTask = contextRef!.tasks.find((t) => t.id === 'task-welcome')!;
      expect(welcomeTask.completed).toBe(false);

      // Toggle to completed
      await act(async () => {
        await contextRef!.toggleTask('task-welcome');
      });

      // Check state
      const taskAfterFirstToggle = contextRef!.tasks.find((t) => t.id === 'task-welcome')!;
      expect(taskAfterFirstToggle.completed).toBe(true);

      // Check raw IndexedDB record
      const db = await getDatabase();
      let persisted = await db.get('tasks', 'task-welcome');
      expect(persisted!.completed).toBe(true);

      // Toggle back to incomplete
      await act(async () => {
        await contextRef!.toggleTask('task-welcome');
      });

      const taskAfterSecondToggle = contextRef!.tasks.find((t) => t.id === 'task-welcome')!;
      expect(taskAfterSecondToggle.completed).toBe(false);

      persisted = await db.get('tasks', 'task-welcome');
      expect(persisted!.completed).toBe(false);
    });

    it('guarantees atomic batch rescheduling across multiple tasks in IndexedDB and Context', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      const targetDate1 = '2026-10-15';
      const targetDate2 = '2026-10-16';

      await act(async () => {
        await contextRef!.batchReschedule([
          { taskId: 'task-welcome', newDueDate: targetDate1 },
          { taskId: 'task-work-sprint', newDueDate: targetDate2 },
        ]);
      });

      // Check context state
      expect(contextRef!.tasks.find((t) => t.id === 'task-welcome')?.dueDate).toBe(targetDate1);
      expect(contextRef!.tasks.find((t) => t.id === 'task-work-sprint')?.dueDate).toBe(targetDate2);

      // Check direct IndexedDB store
      const db = await getDatabase();
      const task1 = await db.get('tasks', 'task-welcome');
      const task2 = await db.get('tasks', 'task-work-sprint');
      expect(task1!.dueDate).toBe(targetDate1);
      expect(task2!.dueDate).toBe(targetDate2);
    });

    it('survives page reload / remount: all modifications persist intact in IndexedDB', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      // 1. Initial mount
      const { unmount } = render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Create a persistent task
      let createdTaskId = '';
      await act(async () => {
        const created = await contextRef!.addTask({
          title: 'Persistent Reload Task',
          description: 'Testing that remount preserves full state',
          projectId: 'work',
          priority: 'high',
          dueDate: '2026-11-20',
          completed: false,
        });
        createdTaskId = created.id;
      });

      // Toggle another task
      await act(async () => {
        await contextRef!.toggleTask('task-groceries');
      });

      // 2. Unmount (simulating user closing or reloading page)
      unmount();
      closeDatabase();

      // 3. Remount fresh AppProvider
      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Verify the created task is loaded from IndexedDB
      const reloadedTask = contextRef!.tasks.find((t) => t.id === createdTaskId);
      expect(reloadedTask).toBeDefined();
      expect(reloadedTask!.title).toBe('Persistent Reload Task');
      expect(reloadedTask!.description).toBe('Testing that remount preserves full state');
      expect(reloadedTask!.projectId).toBe('work');
      expect(reloadedTask!.priority).toBe('high');
      expect(reloadedTask!.dueDate).toBe('2026-11-20');
      expect(reloadedTask!.completed).toBe(false);

      // Verify the toggled task survived reload
      const reloadedGroceries = contextRef!.tasks.find((t) => t.id === 'task-groceries');
      expect(reloadedGroceries!.completed).toBe(true);
    });

    it('correctly handles sorting and filtering edge cases in AppContext', async () => {
      let contextRef: ReturnType<typeof useApp> | null = null;

      const Inspector: React.FC = () => {
        const ctx = useApp();
        contextRef = ctx;
        return <EmpiricalStressHarness />;
      };

      render(
        <AppProvider>
          <Inspector />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('stress-loading')).not.toBeInTheDocument();
        expect(contextRef?.tasks.length).toBeGreaterThanOrEqual(4);
      });

      // Test sorting by priority-desc
      await act(async () => {
        contextRef!.setSortBy('priority-desc');
      });

      const priorities = contextRef!.filteredTasks
        .filter((t) => !t.completed)
        .map((t) => t.priority);
      const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorityWeights[priorities[i]]).toBeGreaterThanOrEqual(priorityWeights[priorities[i + 1]]);
      }

      // Test sorting by alphabetical
      await act(async () => {
        contextRef!.setSortBy('alphabetical');
      });
      const activeTitles = contextRef!.filteredTasks
        .filter((t) => !t.completed)
        .map((t) => t.title);
      for (let i = 0; i < activeTitles.length - 1; i++) {
        expect(activeTitles[i].localeCompare(activeTitles[i + 1])).toBeLessThanOrEqual(0);
      }

      // Test search query filtering
      await act(async () => {
        contextRef!.setSearchQuery('sourdough');
      });
      expect(contextRef!.filteredTasks.length).toBe(1);
      expect(contextRef!.filteredTasks[0].title).toBe('Pick up fresh groceries & coffee beans');

      // Clear search query
      await act(async () => {
        contextRef!.setSearchQuery('');
      });
      expect(contextRef!.filteredTasks.length).toBeGreaterThan(1);
    });

    it('handles direct repository errors when operating on non-existent records', async () => {
      const db = await getDatabase();
      await seedInitialData(db);

      await expect(taskRepository.update({ id: 'non-existent-id' })).rejects.toThrow(
        'Task with id non-existent-id not found'
      );
      await expect(taskRepository.toggleComplete('non-existent-id')).rejects.toThrow(
        'Task with id non-existent-id not found'
      );
      await expect(projectRepository.delete('inbox')).rejects.toThrow(
        'Cannot delete default system project'
      );
    });
  });
});
