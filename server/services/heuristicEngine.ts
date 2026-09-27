import {
  Task,
  WorkloadAnalysisResponse,
  DateSummary,
  Recommendation,
  RescheduleSuggestionsResponse,
  DecomposeTaskResponse,
} from '../types/ai';

const DAILY_TASK_CAPACITY = 4;
const DAILY_MINUTES_CAPACITY = 300; // 5 hours

function getEstimatedMinutes(task: Task): number {
  if (task.estimatedMinutes && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }
  switch (task.priority) {
    case 'high':
      return 90;
    case 'medium':
      return 45;
    case 'low':
    default:
      return 30;
  }
}

export class HeuristicEngine {
  static analyzeWorkload(tasks: Task[], currentDate: string): WorkloadAnalysisResponse {
    const activeTasks = tasks.filter((t) => !t.completed);
    const dateMap = new Map<string, Task[]>();

    for (const task of activeTasks) {
      const date = task.dueDate || 'no-date';
      const list = dateMap.get(date) || [];
      list.push(task);
      dateMap.set(date, list);
    }

    const dateSummaries: DateSummary[] = [];
    const recommendations: Recommendation[] = [];
    let hasOvercommitment = false;
    let hasModerate = false;

    for (const [date, dateTasks] of dateMap.entries()) {
      if (date === 'no-date') continue;

      const totalMinutes = dateTasks.reduce((acc, t) => acc + getEstimatedMinutes(t), 0);
      const isOvercommitted =
        dateTasks.length >= DAILY_TASK_CAPACITY || totalMinutes >= DAILY_MINUTES_CAPACITY;

      const status: 'under' | 'optimal' | 'overcommitted' = isOvercommitted
        ? 'overcommitted'
        : dateTasks.length >= 2
        ? 'optimal'
        : 'under';

      if (isOvercommitted) {
        hasOvercommitment = true;
        // Generate recommendation: move lower priority tasks to next days
        const sorted = [...dateTasks].sort((a, b) => {
          const priorityScore = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
          return priorityScore(a.priority) - priorityScore(b.priority);
        });

        // Recommend rescheduling the lowest priority tasks
        const toReschedule = sorted.slice(0, Math.max(1, dateTasks.length - 3));
        const targetDateObj = new Date(date);
        targetDateObj.setDate(targetDateObj.getDate() + 1);
        const suggestedDate = targetDateObj.toISOString().split('T')[0];

        for (const task of toReschedule) {
          recommendations.push({
            id: `rec-${task.id}-${Date.now()}`,
            taskId: task.id,
            taskTitle: task.title,
            action: 'RESCHEDULE',
            currentDate: date,
            suggestedDate,
            reason: `Date has ${dateTasks.length} tasks (${totalMinutes}m). Moving "${task.title}" to ${suggestedDate} will balance your cognitive load.`,
          });
        }
      } else if (dateTasks.length === 3) {
        hasModerate = true;
      }

      dateSummaries.push({
        date,
        taskCount: dateTasks.length,
        totalEstimatedMinutes: totalMinutes,
        status,
      });
    }

    // Sort summaries by date
    dateSummaries.sort((a, b) => a.date.localeCompare(b.date));

    const workloadLevel = hasOvercommitment
      ? 'overcommitted'
      : hasModerate
      ? 'moderate'
      : 'balanced';

    const currentSummary = dateSummaries.find((d) => d.date === currentDate);
    const todayCount = currentSummary?.taskCount || 0;

    let summaryText: string;
    if (hasOvercommitment) {
      summaryText = `Overcommitment alert: You have ${todayCount} tasks scheduled for today (${currentDate}). This exceeds recommended daily focus capacity. We suggest rebalancing lower-priority items.`;
    } else if (workloadLevel === 'moderate') {
      summaryText = `Your schedule is moderately busy with ${todayCount} tasks today. Focus on high-priority items first.`;
    } else {
      summaryText = `Your workload looks well balanced across the coming days. You are well positioned to complete all tasks on time.`;
    }

    return {
      status: 'fallback',
      workloadLevel,
      summary: summaryText,
      dateSummaries,
      recommendations,
    };
  }

  static getRescheduleSuggestions(
    tasks: Task[],
    targetDate: string
  ): RescheduleSuggestionsResponse {
    const targetTasks = tasks.filter((t) => !t.completed && t.dueDate === targetDate);
    const sorted = [...targetTasks].sort((a, b) => {
      const score = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
      return score(a.priority) - score(b.priority);
    });

    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Reschedule lowest priority items
    const candidates = sorted.filter((t) => t.priority === 'low' || t.priority === 'medium');
    const itemsToMove = candidates.length > 0 ? candidates : sorted.slice(0, 1);

    const suggestions = itemsToMove.map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      currentDueDate: t.dueDate,
      suggestedDate: tomorrowStr,
      reason: `Rebalance load from busy ${targetDate} to ${tomorrowStr}`,
    }));

    return {
      status: 'fallback',
      suggestions,
    };
  }

  static decomposeTask(
    title: string,
    _description?: string,
    estimatedMinutes?: number
  ): DecomposeTaskResponse {
    const totalMin = estimatedMinutes || 60;
    const subtaskTime = Math.max(15, Math.round(totalMin / 3));

    return {
      status: 'fallback',
      subtasks: [
        { title: `Prepare and outline requirements for "${title}"`, estimatedMinutes: subtaskTime },
        { title: `Execute core implementation of "${title}"`, estimatedMinutes: subtaskTime },
        { title: `Review, test, and finalize "${title}"`, estimatedMinutes: subtaskTime },
      ],
    };
  }
}
