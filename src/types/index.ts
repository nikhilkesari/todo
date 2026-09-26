export type Priority = 'low' | 'medium' | 'high';
export type Complexity = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string; // ISO YYYY-MM-DD
  projectId: string; // references Project.id
  priority: Priority;
  complexity: Complexity;
  estimatedMinutes?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface TaskCreateInput {
  id?: string;
  title: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  projectId?: string;
  priority?: Priority;
  complexity?: Complexity;
  estimatedMinutes?: number;
}

export type TaskUpdateInput = Partial<Omit<Task, 'id' | 'createdAt'>> & {
  id: string;
};

export interface Project {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  createdAt: string; // ISO 8601
}

export interface ProjectCreateInput {
  id?: string;
  name: string;
  color?: string;
  isDefault?: boolean;
}

export type QuickFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

export type TaskSortBy =
  | 'dueDate-asc'
  | 'dueDate-desc'
  | 'priority-desc'
  | 'createdAt-desc'
  | 'alphabetical';

export interface FilterState {
  quickFilter: QuickFilter;
  projectId?: string | null;
  searchQuery: string;
  sortBy: TaskSortBy;
  hideCompleted: boolean;
}
