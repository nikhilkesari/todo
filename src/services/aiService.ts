import { Task } from '../types';

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

export interface WorkloadAnalysisResult {
  status: 'success' | 'fallback';
  workloadLevel: 'balanced' | 'moderate' | 'overcommitted';
  summary: string;
  dateSummaries: DateSummary[];
  recommendations: Recommendation[];
}

export interface RescheduleSuggestion {
  taskId: string;
  taskTitle: string;
  currentDueDate?: string;
  suggestedDate: string;
  reason: string;
}

class AIService {
  private baseUrl = '/api';

  async analyzeWorkload(tasks: Task[], currentDate?: string): Promise<WorkloadAnalysisResult> {
    try {
      const today = currentDate || new Date().toISOString().split('T')[0];
      const res = await fetch(`${this.baseUrl}/ai/analyze-workload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, currentDate: today }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Network call to backend AI proxy failed; using local fallback:', err);
      return this.localAnalyzeWorkload(tasks, currentDate);
    }
  }

  async getRescheduleSuggestions(
    tasks: Task[],
    targetDate?: string
  ): Promise<RescheduleSuggestion[]> {
    try {
      const date = targetDate || new Date().toISOString().split('T')[0];
      const res = await fetch(`${this.baseUrl}/ai/reschedule-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, targetDate: date }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return this.localRescheduleSuggestions(tasks, targetDate);
    }
  }

  private localAnalyzeWorkload(tasks: Task[], currentDate?: string): WorkloadAnalysisResult {
    const today = currentDate || new Date().toISOString().split('T')[0];
    const activeTasks = tasks.filter((t) => !t.completed);
    const dateMap = new Map<string, Task[]>();

    for (const t of activeTasks) {
      const d = t.dueDate || 'no-date';
      const arr = dateMap.get(d) || [];
      arr.push(t);
      dateMap.set(d, arr);
    }

    const dateSummaries: DateSummary[] = [];
    const recommendations: Recommendation[] = [];
    let isOvercommitted = false;

    for (const [date, list] of dateMap.entries()) {
      if (date === 'no-date') continue;
      const count = list.length;
      const totalMinutes = count * 45;
      const over = count >= 4;
      if (over) isOvercommitted = true;

      dateSummaries.push({
        date,
        taskCount: count,
        totalEstimatedMinutes: totalMinutes,
        status: over ? 'overcommitted' : count >= 2 ? 'optimal' : 'under',
      });

      if (over) {
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const lowPrio = list.filter((t) => t.priority === 'low');
        const toMove = lowPrio.length > 0 ? lowPrio : [list[0]];

        for (const task of toMove) {
          recommendations.push({
            id: `rec-${task.id}`,
            taskId: task.id,
            taskTitle: task.title,
            action: 'RESCHEDULE',
            currentDate: date,
            suggestedDate: tomorrowStr,
            reason: `Date has ${count} tasks. Moving "${task.title}" to ${tomorrowStr} balances your workload.`,
          });
        }
      }
    }

    dateSummaries.sort((a, b) => a.date.localeCompare(b.date));

    const todaySummary = dateSummaries.find((d) => d.date === today);
    const todayCount = todaySummary?.taskCount || 0;

    return {
      status: 'fallback',
      workloadLevel: isOvercommitted ? 'overcommitted' : todayCount >= 2 ? 'moderate' : 'balanced',
      summary: isOvercommitted
        ? `You have ${todayCount} tasks due today. Consider rescheduling lower-priority tasks.`
        : `Your schedule looks well-balanced with ${todayCount} tasks due today.`,
      dateSummaries,
      recommendations,
    };
  }

  private localRescheduleSuggestions(tasks: Task[], targetDate?: string): RescheduleSuggestion[] {
    const today = targetDate || new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter((t) => !t.completed && t.dueDate === today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const lowPrio = todayTasks.filter((t) => t.priority === 'low');
    const toMove = lowPrio.length > 0 ? lowPrio : todayTasks.slice(0, 1);

    return toMove.map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      currentDueDate: t.dueDate,
      suggestedDate: tomorrowStr,
      reason: `Rebalance load from busy ${today} to ${tomorrowStr}`,
    }));
  }
}

export const aiService = new AIService();
