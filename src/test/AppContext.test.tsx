import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { closeDatabase, DB_NAME } from '../db/database';
import { taskRepository } from '../db/taskRepository';
import { getTodayDateString } from '../utils/dateUtils';

const TestConsumer: React.FC = () => {
  const {
    tasks,
    projects,
    isLoading,
    addTask,
    toggleTask,
    deleteTask,
    quickFilter,
    setQuickFilter,
    filteredTasks,
  } = useApp();

  if (isLoading) {
    return <div data-testid="loading-indicator">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="task-count">{tasks.length}</div>
      <div data-testid="filtered-count">{filteredTasks.length}</div>
      <div data-testid="project-count">{projects.length}</div>
      <div data-testid="active-filter">{quickFilter}</div>

      <button
        data-testid="add-btn"
        onClick={async () => { await addTask({ title: 'New Test Task', dueDate: getTodayDateString() }); }}
      >
        Add Task
      </button>

      {filteredTasks.map((task) => (
        <div key={task.id} data-testid={`test-task-${task.id}`}>
          <span data-testid={`title-${task.id}`}>{task.title}</span>
          <span data-testid={`status-${task.id}`}>{task.completed ? 'done' : 'pending'}</span>
          <button data-testid={`toggle-${task.id}`} onClick={async () => { await toggleTask(task.id); }}>
            Toggle
          </button>
          <button data-testid={`delete-${task.id}`} onClick={async () => { await deleteTask(task.id); }}>
            Delete
          </button>
        </div>
      ))}

      <button data-testid="set-filter-today" onClick={() => setQuickFilter('today')}>
        Filter Today
      </button>
      <button data-testid="set-filter-completed" onClick={() => setQuickFilter('completed')}>
        Filter Completed
      </button>
    </div>
  );
};

describe('AppContext & AppProvider', () => {
  beforeEach(async () => {
    await closeDatabase();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('initializes database with seed projects and tasks on first launch', async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const projectCount = screen.getByTestId('project-count').textContent;
    expect(Number(projectCount)).toBe(4); // Inbox, Work, Personal, Groceries

    const taskCount = screen.getByTestId('task-count').textContent;
    expect(Number(taskCount)).toBeGreaterThanOrEqual(4);
  });

  it('optimistically adds a task and persists to IndexedDB', async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const initialCount = Number(screen.getByTestId('task-count').textContent);

    await act(async () => {
      screen.getByTestId('add-btn').click();
    });

    const newCount = Number(screen.getByTestId('task-count').textContent);
    expect(newCount).toBe(initialCount + 1);
    expect(screen.getByText('New Test Task')).toBeInTheDocument();

    await waitFor(async () => {
      const all = await taskRepository.getAll();
      expect(all.some((t) => t.title === 'New Test Task')).toBe(true);
    });
  });

  it('optimistically toggles task completion', async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Welcome task is initially pending
    const welcomeToggleBtn = screen.getByTestId('toggle-task-welcome');
    expect(screen.getByTestId('status-task-welcome').textContent).toBe('pending');

    await act(async () => {
      welcomeToggleBtn.click();
    });

    expect(screen.getByTestId('status-task-welcome').textContent).toBe('done');

    await waitFor(async () => {
      const persisted = await taskRepository.getById('task-welcome');
      expect(persisted?.completed).toBe(true);
    });
  });

  it('optimistically deletes a task', async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    const initialCount = Number(screen.getByTestId('task-count').textContent);
    const deleteBtn = screen.getByTestId('delete-task-welcome');

    await act(async () => {
      deleteBtn.click();
    });

    const afterCount = Number(screen.getByTestId('task-count').textContent);
    expect(afterCount).toBe(initialCount - 1);
    expect(screen.queryByTestId('test-task-task-welcome')).not.toBeInTheDocument();

    await waitFor(async () => {
      const persisted = await taskRepository.getById('task-welcome');
      expect(persisted).toBeUndefined();
    });
  });

  it('filters tasks when quickFilter changes', async () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Filter completed
    await act(async () => {
      screen.getByTestId('set-filter-completed').click();
    });

    expect(screen.getByTestId('active-filter').textContent).toBe('completed');
    // Task-walk was seeded as completed: true
    expect(screen.getByTestId('test-task-task-walk')).toBeInTheDocument();
    // Task-welcome was seeded as completed: false
    expect(screen.queryByTestId('test-task-task-welcome')).not.toBeInTheDocument();
  });
});
