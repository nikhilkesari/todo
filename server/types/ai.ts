export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string; // ISO YYYY-MM-DD
  projectId: string;
  priority: 'low' | 'medium' | 'high';
  complexity?: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DateSummary {
  date: string;
  taskCount: number;
  totalEstimatedMinutes: number;
  status: 'under' | 'optimal' | 'overcommitted';
}

export interface Recommendation {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'RESCHEDULE' | 'SPLIT' | 'PRIORITIZE';
  currentDate?: string;
  suggestedDate?: string;
  reason: string;
}

export interface WorkloadAnalysisResponse {
  status: 'success' | 'fallback';
  workloadLevel: 'balanced' | 'moderate' | 'overcommitted';
  summary: string;
  dateSummaries: DateSummary[];
  recommendations: Recommendation[];
}

export interface RescheduleSuggestionsResponse {
  status: 'success' | 'fallback';
  suggestions: Array<{
    taskId: string;
    taskTitle: string;
    currentDueDate?: string;
    suggestedDate: string;
    reason: string;
  }>;
}

export interface DecomposeTaskResponse {
  status: 'success' | 'fallback';
  subtasks: Array<{
    title: string;
    estimatedMinutes: number;
  }>;
}
