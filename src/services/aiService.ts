import { Task, VoiceChatMessage, VoiceDialogueResponse } from '../types';

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

  async voiceDialogue(
    messages: VoiceChatMessage[],
    projects?: Array<{ id: string; name: string }>,
    currentDate?: string
  ): Promise<VoiceDialogueResponse> {
    try {
      const today = currentDate || new Date().toISOString().split('T')[0];
      const res = await fetch(`${this.baseUrl}/ai/voice-dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, currentDate: today, projects }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Network call to voice-dialogue proxy failed; using local fallback:', err);
      return this.localVoiceDialogue(messages, projects, currentDate);
    }
  }

  private localVoiceDialogue(
    messages: VoiceChatMessage[],
    projects: Array<{ id: string; name: string }> = [],
    currentDate?: string
  ): VoiceDialogueResponse {
    const today = currentDate || new Date().toISOString().split('T')[0];
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
        reply: "No problem at all! I've cancelled that for you.",
        isComplete: false,
        action: 'cancel',
      };
    }

    // Helper to extract date
    const parseRelativeDate = (text: string, baseDateStr: string): string => {
      const base = new Date(baseDateStr);
      const textLower = text.toLowerCase();

      if (/\bday after tomorrow\b/i.test(textLower)) {
        const d = new Date(base);
        d.setDate(d.getDate() + 2);
        return d.toISOString().split('T')[0];
      }
      if (/\btomorrow\b/i.test(textLower)) {
        const d = new Date(base);
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
          const currentDay = base.getDay();
          let diff = i - currentDay;
          if (diff <= 0) diff += 7;
          const target = new Date(base);
          target.setDate(target.getDate() + diff);
          return target.toISOString().split('T')[0];
        }
      }

      const inDaysMatch = textLower.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1], 10);
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      }

      const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (isoMatch) {
        return isoMatch[1];
      }

      return '';
    };

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

    const matchPriority = (text: string): 'low' | 'medium' | 'high' => {
      if (/\b(urgent|asap|critical|high priority|important)\b/i.test(text)) return 'high';
      if (/\b(low priority|whenever|not urgent|chill|someday)\b/i.test(text)) return 'low';
      return 'medium';
    };

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

    let accumulatedTitle = '';
    let accumulatedDate = '';
    let accumulatedProjectId = 'inbox';
    let accumulatedPriority: 'low' | 'medium' | 'high' = 'medium';

    const isAffirmative = /\b(yes|yeah|yep|sure|sounds good|looks good|looks perfect|go ahead|confirm|add it|do it|perfect|please do|ok|okay|looks great|that's right|correct|please add)\b/i.test(lower);

    for (const msg of userMessages) {
      const d = parseRelativeDate(msg.content, today);
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

    if (accumulatedTitle) {
      const projName = projects.find((p) => p.id === accumulatedProjectId)?.name || 'Inbox';

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

      const dateDisplay = accumulatedDate === today ? 'today' : accumulatedDate;
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

    return {
      status: 'fallback',
      reply: "I'd love to help! Tell me what task you'd like to create, like 'Prepare slides for meeting tomorrow under Work'.",
      isComplete: false,
      action: 'chat',
    };
  }
}

export const aiService = new AIService();

