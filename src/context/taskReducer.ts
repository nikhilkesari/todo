import { Task, Project, TaskUpdateInput } from '../types';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  snapshots: Record<string, Task>;
  deletedSnapshots: Record<string, { task: Task; index: number }>;
  batchSnapshots: Record<string, Task[]>;
}

export type AppAction =
  | { type: 'SET_INITIAL_DATA'; payload: { tasks: Task[]; projects: Project[] } }
  | { type: 'TASK_OPTIMISTIC_ADD'; payload: Task }
  | { type: 'TASK_CONFIRM_ADD'; payload: { tempId: string; task: Task } }
  | { type: 'TASK_ROLLBACK_ADD'; payload: { tempId: string } }
  | { type: 'TASK_OPTIMISTIC_UPDATE'; payload: TaskUpdateInput }
  | { type: 'TASK_CONFIRM_UPDATE'; payload: Task }
  | { type: 'TASK_ROLLBACK_UPDATE'; payload: { id: string } }
  | { type: 'TASK_OPTIMISTIC_TOGGLE'; payload: { id: string } }
  | { type: 'TASK_OPTIMISTIC_DELETE'; payload: { id: string } }
  | { type: 'TASK_CONFIRM_DELETE'; payload: { id: string } }
  | { type: 'TASK_ROLLBACK_DELETE'; payload: { id: string } }
  | {
      type: 'TASK_OPTIMISTIC_BATCH_RESCHEDULE';
      payload: { batchId: string; suggestions: Array<{ taskId: string; newDueDate: string }> };
    }
  | { type: 'TASK_CONFIRM_BATCH_RESCHEDULE'; payload: { batchId: string; tasks: Task[] } }
  | { type: 'TASK_ROLLBACK_BATCH_RESCHEDULE'; payload: { batchId: string } }
  | { type: 'PROJECT_ADD'; payload: Project }
  | { type: 'PROJECT_DELETE'; payload: { id: string } };

export const initialAppState: AppState = {
  tasks: [],
  projects: [],
  snapshots: {},
  deletedSnapshots: {},
  batchSnapshots: {},
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        tasks: action.payload.tasks,
        projects: action.payload.projects,
        snapshots: {},
        deletedSnapshots: {},
        batchSnapshots: {},
      };

    // -----------------------------------------------------------------------
    // ADD TASK
    // -----------------------------------------------------------------------
    case 'TASK_OPTIMISTIC_ADD':
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
      };

    case 'TASK_CONFIRM_ADD':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.tempId ? action.payload.task : t
        ),
      };

    case 'TASK_ROLLBACK_ADD':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload.tempId),
      };

    // -----------------------------------------------------------------------
    // UPDATE TASK
    // -----------------------------------------------------------------------
    case 'TASK_OPTIMISTIC_UPDATE': {
      const target = state.tasks.find((t) => t.id === action.payload.id);
      if (!target) return state;

      return {
        ...state,
        // Only record pristine snapshot if not already tracked by an earlier pending mutation
        snapshots: {
          ...state.snapshots,
          [action.payload.id]: state.snapshots[action.payload.id] ?? target,
        },
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id
            ? {
                ...t,
                ...action.payload,
                title: action.payload.title !== undefined ? action.payload.title.trim() : t.title,
                description:
                  action.payload.description !== undefined
                    ? action.payload.description.trim() || undefined
                    : t.description,
                dueDate:
                  action.payload.dueDate !== undefined
                    ? action.payload.dueDate || undefined
                    : t.dueDate,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      };
    }

    case 'TASK_CONFIRM_UPDATE': {
      const { [action.payload.id]: _, ...remainingSnapshots } = state.snapshots;
      return {
        ...state,
        snapshots: remainingSnapshots,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    }

    case 'TASK_ROLLBACK_UPDATE': {
      const original = state.snapshots[action.payload.id];
      if (!original) return state;

      const { [action.payload.id]: _, ...remainingSnapshots } = state.snapshots;
      return {
        ...state,
        snapshots: remainingSnapshots,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? original : t)),
      };
    }

    // -----------------------------------------------------------------------
    // TOGGLE TASK
    // -----------------------------------------------------------------------
    case 'TASK_OPTIMISTIC_TOGGLE': {
      const target = state.tasks.find((t) => t.id === action.payload.id);
      if (!target) return state;

      return {
        ...state,
        snapshots: {
          ...state.snapshots,
          [action.payload.id]: state.snapshots[action.payload.id] ?? target,
        },
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id
            ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
            : t
        ),
      };
    }

    // -----------------------------------------------------------------------
    // DELETE TASK
    // -----------------------------------------------------------------------
    case 'TASK_OPTIMISTIC_DELETE': {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index === -1) return state;

      const target = state.tasks[index];
      return {
        ...state,
        deletedSnapshots: {
          ...state.deletedSnapshots,
          [action.payload.id]: { task: target, index },
        },
        tasks: state.tasks.filter((t) => t.id !== action.payload.id),
      };
    }

    case 'TASK_CONFIRM_DELETE': {
      const { [action.payload.id]: _, ...remainingDeleted } = state.deletedSnapshots;
      return {
        ...state,
        deletedSnapshots: remainingDeleted,
      };
    }

    case 'TASK_ROLLBACK_DELETE': {
      const snapshot = state.deletedSnapshots[action.payload.id];
      if (!snapshot) return state;

      const { [action.payload.id]: _, ...remainingDeleted } = state.deletedSnapshots;
      const nextTasks = [...state.tasks];
      const insertIndex = Math.min(snapshot.index, nextTasks.length);
      nextTasks.splice(insertIndex, 0, snapshot.task);

      return {
        ...state,
        deletedSnapshots: remainingDeleted,
        tasks: nextTasks,
      };
    }

    // -----------------------------------------------------------------------
    // BATCH RESCHEDULE
    // -----------------------------------------------------------------------
    case 'TASK_OPTIMISTIC_BATCH_RESCHEDULE': {
      const { batchId, suggestions } = action.payload;
      const suggestionMap = new Map(suggestions.map((s) => [s.taskId, s.newDueDate]));
      const affectedOriginals = state.tasks.filter((t) => suggestionMap.has(t.id));

      return {
        ...state,
        batchSnapshots: {
          ...state.batchSnapshots,
          [batchId]: affectedOriginals,
        },
        tasks: state.tasks.map((t) => {
          const newDueDate = suggestionMap.get(t.id);
          if (newDueDate !== undefined) {
            return { ...t, dueDate: newDueDate, updatedAt: new Date().toISOString() };
          }
          return t;
        }),
      };
    }

    case 'TASK_CONFIRM_BATCH_RESCHEDULE': {
      const { batchId, tasks: persisted } = action.payload;
      const persistedMap = new Map(persisted.map((t) => [t.id, t]));
      const { [batchId]: _, ...remainingBatches } = state.batchSnapshots;

      return {
        ...state,
        batchSnapshots: remainingBatches,
        tasks: state.tasks.map((t) => persistedMap.get(t.id) || t),
      };
    }

    case 'TASK_ROLLBACK_BATCH_RESCHEDULE': {
      const { batchId } = action.payload;
      const originals = state.batchSnapshots[batchId];
      if (!originals) return state;

      const originalMap = new Map(originals.map((t) => [t.id, t]));
      const { [batchId]: _, ...remainingBatches } = state.batchSnapshots;

      return {
        ...state,
        batchSnapshots: remainingBatches,
        tasks: state.tasks.map((t) => originalMap.get(t.id) || t),
      };
    }

    // -----------------------------------------------------------------------
    // PROJECTS
    // -----------------------------------------------------------------------
    case 'PROJECT_ADD':
      return {
        ...state,
        projects: [...state.projects, action.payload],
      };

    case 'PROJECT_DELETE': {
      const projectId = action.payload.id;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== projectId),
        tasks: state.tasks.map((t) =>
          t.projectId === projectId ? { ...t, projectId: 'inbox' } : t
        ),
      };
    }

    default:
      return state;
  }
}
