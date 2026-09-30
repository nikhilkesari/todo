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

  static handleVoiceDialogue(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    currentDate: string,
    projects: Array<{ id: string; name: string }> = []
  ): import('../types/ai').VoiceDialogueResponse {
    const userMessages = messages.filter((m) => m.role === 'user');
    const latestUserMsg = userMessages[userMessages.length - 1]?.content.trim() || '';

    if (!latestUserMsg) {
      return {
        status: 'fallback',
        reply: "Hey there! What can I help you add to your task list today?",
        isComplete: false,
        action: 'chat',
      };
    }

    const lower = latestUserMsg.toLowerCase();

    // Check cancellation
    if (/\b(cancel|never mind|forget it|stop|abort|don't add|no thanks)\b/i.test(lower)) {
      return {
        status: 'fallback',
        reply: "No worries at all! I've cancelled that for you. Let me know whenever you'd like to add something else.",
        isComplete: false,
        action: 'cancel',
      };
    }

    // Accumulate context from all previous messages
    let accumulatedTitle = '';
    let accumulatedDate = '';
    let accumulatedProjectId = 'inbox';
    let accumulatedPriority: 'low' | 'medium' | 'high' = 'medium';

    // Helper to extract date
    const parseRelativeDate = (text: string, baseDateStr: string): string => {
      const today = new Date(baseDateStr);
      const textLower = text.toLowerCase();

      if (/\bday after tomorrow\b/i.test(textLower)) {
        const d = new Date(today);
        d.setDate(d.getDate() + 2);
        return d.toISOString().split('T')[0];
      }
      if (/\btomorrow\b/i.test(textLower)) {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      }
      if (/\btoday\b/i.test(textLower)) {
        return baseDateStr;
      }

      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < daysOfWeek.length; i++) {
        const dayName = daysOfWeek[i];
        if (new RegExp(`\\b(this|next|on)?\\s*${dayName}\\b`, 'i').test(textLower)) {
          const currentDay = today.getDay();
          let diff = i - currentDay;
          if (diff <= 0) diff += 7;
          const target = new Date(today);
          target.setDate(target.getDate() + diff);
          return target.toISOString().split('T')[0];
        }
      }

      const inDaysMatch = textLower.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1], 10);
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      }

      const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (isoMatch) {
        return isoMatch[1];
      }

      return '';
    };

    // Helper to extract project
    const matchProject = (text: string): string => {
      const textLower = text.toLowerCase();
      for (const p of projects) {
        if (textLower.includes(p.name.toLowerCase()) || textLower.includes(p.id.toLowerCase())) {
          return p.id;
        }
      }
      if (/\b(work|office|job|meeting|client)\b/i.test(textLower)) {
        const workProj = projects.find((p) => /work/i.test(p.name));
        return workProj ? workProj.id : 'work';
      }
      if (/\b(personal|home|errand|family)\b/i.test(textLower)) {
        const personalProj = projects.find((p) => /personal/i.test(p.name));
        return personalProj ? personalProj.id : 'personal';
      }
      if (/\b(grocery|groceries|shopping|market|food)\b/i.test(textLower)) {
        const grocProj = projects.find((p) => /grocer/i.test(p.name));
        return grocProj ? grocProj.id : 'groceries';
      }
      return 'inbox';
    };

    // Helper to extract priority
    const matchPriority = (text: string): 'low' | 'medium' | 'high' => {
      if (/\b(urgent|asap|critical|high priority|important)\b/i.test(text)) return 'high';
      if (/\b(low priority|whenever|not urgent|chill|someday)\b/i.test(text)) return 'low';
      return 'medium';
    };

    // Helper to check if a message is purely answering clarification about date/project/priority
    const isPureMetadataAnswer = (text: string): boolean => {
      let stripped = text.toLowerCase();
      stripped = stripped.replace(/\b(day after tomorrow|tomorrow|today|yesterday|next week|this week)\b/gi, '');
      stripped = stripped.replace(/\b(this|next|on)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
      stripped = stripped.replace(/\bin\s+\d+\s+days?\b/gi, '');
      for (const p of projects) {
        stripped = stripped.replace(new RegExp(`\\b${p.name}\\b`, 'gi'), '');
        stripped = stripped.replace(new RegExp(`\\b${p.id}\\b`, 'gi'), '');
      }
      stripped = stripped.replace(/\b(work|office|personal|groceries|shopping|inbox)\b/gi, '');
      stripped = stripped.replace(/\b(high|medium|low|urgent|priority|important)\b/gi, '');
      stripped = stripped.replace(/\b(for|in|under|the|list|project|at|on|and|with|make it|set it|put it)\b/gi, '');
      stripped = stripped.replace(/[^a-z0-9]/gi, '').trim();
      return stripped.length === 0;
    };

    // Extract title cleaning common voice prefixes and suffixes
    const extractCleanTitle = (text: string): string => {
      let t = text;
      t = t.replace(/^(can you\s+)?(please\s+)?(add|create|make|put|remind me to|i need to|i want to|schedule|set up)\s+/i, '');
      t = t.replace(/^(a\s+)?(new\s+)?task\s+(to\s+|for\s+|called\s+)?/i, '');
      t = t.replace(/\b(for|due|by)\s+(day after tomorrow|today|tomorrow|next\s+[a-z]+|this\s+[a-z]+|in\s+\d+\s+days?)\b/gi, '');
      t = t.replace(/\b(in|under|to)\s+(the\s+)?(work|personal|groceries|shopping|inbox)(\s+project|\s+list)?\b/gi, '');
      t = t.replace(/\b(with\s+)?(high|medium|low)\s+priority\b/gi, '');
      t = t.replace(/\s{2,}/g, ' ').trim();
      if (t.length > 0) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
      }
      return t;
    };

    // Check if the latest message is an affirmative confirmation
    const isAffirmative = /\b(yes|yeah|yep|sure|sounds good|looks good|looks perfect|go ahead|confirm|add it|do it|perfect|please do|ok|okay|looks great|that's right|correct|please add)\b/i.test(lower);

    // Scan full conversation to collect state
    for (const msg of userMessages) {
      const d = parseRelativeDate(msg.content, currentDate);
      if (d) accumulatedDate = d;

      const p = matchProject(msg.content);
      if (p !== 'inbox' || accumulatedProjectId === 'inbox') accumulatedProjectId = p;

      const prio = matchPriority(msg.content);
      if (prio !== 'medium' || accumulatedPriority === 'medium') accumulatedPriority = prio;

      const msgLower = msg.content.toLowerCase();
      const isAff = /\b(yes|yeah|yep|sure|sounds good|looks good|looks perfect|go ahead|confirm|add it|do it|perfect|please do|ok|okay|looks great|that's right|correct|please add)\b/i.test(msgLower);

      if (!isAff && !isPureMetadataAnswer(msg.content)) {
        const cleaned = extractCleanTitle(msg.content);
        if (cleaned.length > 2) {
          accumulatedTitle = cleaned;
        }
      }
    }



    // If we have an accumulated title and user confirmed:
    if (accumulatedTitle && isAffirmative && userMessages.length > 1) {
      const projName = projects.find((p) => p.id === accumulatedProjectId)?.name || 'Inbox';
      const dateText = accumulatedDate ? ` for ${accumulatedDate}` : '';
      return {
        status: 'fallback',
        reply: `Awesome! I've added "${accumulatedTitle}"${dateText} to ${projName}. You're all set!`,
        isComplete: true,
        action: 'complete',
        extractedTask: {
          title: accumulatedTitle,
          dueDate: accumulatedDate || undefined,
          projectId: accumulatedProjectId,
          priority: accumulatedPriority,
        },
      };
    }

    // If user provided a title in this turn or previous turns
    if (accumulatedTitle) {
      const projName = projects.find((p) => p.id === accumulatedProjectId)?.name || 'Inbox';

      // If we don't have a due date yet, ask for it conversationally
      if (!accumulatedDate) {
        return {
          status: 'fallback',
          reply: `Got it, "${accumulatedTitle}"! When would you like to get that done? And should I file it under ${projName}?`,
          isComplete: false,
          action: 'clarify',
          extractedTask: {
            title: accumulatedTitle,
            projectId: accumulatedProjectId,
            priority: accumulatedPriority,
          },
          suggestedFollowUp: 'Say "tomorrow" or "this Friday"',
        };
      }

      // If we have date and project, ask for confirmation
      const dateDisplay = accumulatedDate === currentDate ? 'today' : accumulatedDate;
      return {
        status: 'fallback',
        reply: `Sounds great! I've set up "${accumulatedTitle}" for ${dateDisplay} under ${projName} with ${accumulatedPriority} priority. Shall I go ahead and add that?`,
        isComplete: false,
        action: 'confirm',
        extractedTask: {
          title: accumulatedTitle,
          dueDate: accumulatedDate,
          projectId: accumulatedProjectId,
          priority: accumulatedPriority,
        },
        suggestedFollowUp: 'Say "Yes, add it" or "Cancel"',
      };
    }

    // Generic fallback friendly prompt
    return {
      status: 'fallback',
      reply: "I'd love to help! Tell me what task you'd like to create, like 'Prepare slides for meeting tomorrow under Work'.",
      isComplete: false,
      action: 'chat',
    };
  }
}

