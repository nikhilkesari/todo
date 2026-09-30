import { GoogleGenAI } from '@google/genai';
import {
  Task,
  WorkloadAnalysisResponse,
  RescheduleSuggestionsResponse,
  DecomposeTaskResponse,
  VoiceChatMessage,
  VoiceDialogueResponse,
} from '../types/ai';
import { HeuristicEngine } from './heuristicEngine';

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private model = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  getModel(): string {
    return this.model;
  }

  async analyzeWorkload(tasks: Task[], currentDate: string): Promise<WorkloadAnalysisResponse> {
    if (!this.client) {
      return HeuristicEngine.analyzeWorkload(tasks, currentDate);
    }

    try {
      const activeTasks = tasks.filter((t) => !t.completed);
      const prompt = `You are an intelligent task scheduling and workload balance advisor.
Current date: ${currentDate}
Active tasks:
${JSON.stringify(activeTasks, null, 2)}

Analyze this workload. Identify if the user is overcommitted on any specific date (especially if >= 4 tasks or total estimated minutes exceed 300 minutes on one day).
Respond with a strict JSON object conforming to this schema:
{
  "workloadLevel": "balanced" | "moderate" | "overcommitted",
  "summary": "conversational summary explaining the workload and warning if overcommitted",
  "dateSummaries": [
    {
      "date": "YYYY-MM-DD",
      "taskCount": number,
      "totalEstimatedMinutes": number,
      "status": "under" | "optimal" | "overcommitted"
    }
  ],
  "recommendations": [
    {
      "id": "unique string",
      "taskId": "task id to move or split",
      "taskTitle": "title of task",
      "action": "RESCHEDULE" | "SPLIT" | "PRIORITIZE",
      "currentDate": "current due date",
      "suggestedDate": "suggested lighter due date",
      "reason": "why this helps balance the schedule"
    }
  ]
}
Do not wrap in markdown quotes. Return valid JSON only.`;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        status: 'success',
        workloadLevel: parsed.workloadLevel || 'balanced',
        summary: parsed.summary || 'Workload analyzed.',
        dateSummaries: parsed.dateSummaries || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (err) {
      console.warn('Gemini analysis failed or rate-limited; falling back to heuristic engine:', err);
      return HeuristicEngine.analyzeWorkload(tasks, currentDate);
    }
  }

  async getRescheduleSuggestions(
    tasks: Task[],
    targetDate: string
  ): Promise<RescheduleSuggestionsResponse> {
    if (!this.client) {
      return HeuristicEngine.getRescheduleSuggestions(tasks, targetDate);
    }

    try {
      const targetTasks = tasks.filter((t) => !t.completed && t.dueDate === targetDate);
      const prompt = `The user is overcommitted on date ${targetDate}.
Tasks on this date:
${JSON.stringify(targetTasks, null, 2)}

Suggest 1 to 3 tasks to reschedule to subsequent days.
Respond with strict JSON:
{
  "suggestions": [
    {
      "taskId": "task id",
      "taskTitle": "task title",
      "currentDueDate": "${targetDate}",
      "suggestedDate": "YYYY-MM-DD (next available days)",
      "reason": "explanation"
    }
  ]
}`;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        status: 'success',
        suggestions: parsed.suggestions || [],
      };
    } catch {
      return HeuristicEngine.getRescheduleSuggestions(tasks, targetDate);
    }
  }

  async decomposeTask(
    title: string,
    description?: string,
    estimatedMinutes?: number
  ): Promise<DecomposeTaskResponse> {
    if (!this.client) {
      return HeuristicEngine.decomposeTask(title, description, estimatedMinutes);
    }

    try {
      const prompt = `Break down the following task into 3-5 manageable, concrete subtasks:
Title: ${title}
Description: ${description || 'None'}
Estimated Minutes: ${estimatedMinutes || 60}

Respond in strict JSON:
{
  "subtasks": [
    { "title": "subtask title", "estimatedMinutes": number }
  ]
}`;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        status: 'success',
        subtasks: parsed.subtasks || [],
      };
    } catch {
      return HeuristicEngine.decomposeTask(title, description, estimatedMinutes);
    }
  }

  async handleVoiceDialogue(
    messages: VoiceChatMessage[],
    currentDate: string,
    projects: Array<{ id: string; name: string }> = []
  ): Promise<VoiceDialogueResponse> {
    if (!this.client) {
      return HeuristicEngine.handleVoiceDialogue(messages, currentDate, projects);
    }

    try {
      const prompt = `You are a warm, thoughtful, natural human personal assistant for a Todo application.
Your goal is to help the user capture and organize tasks through a natural voice conversation.
The user is talking directly to you. Your reply will be spoken out loud using text-to-speech.

Current local date: ${currentDate}
Available Projects: ${JSON.stringify(projects)}

Conversation History:
${JSON.stringify(messages, null, 2)}

Strict Conversation Guidelines:
1. Speak naturally, warmly, and succinctly (1-2 sentences maximum per turn). You are speaking to a person who is listening to you read this out loud.
2. Avoid robotic or template-sounding phrases like "Task created. Title: X, Date: Y". Talk like a warm, supportive colleague.
3. Understand natural speech and relative dates ("tomorrow afternoon", "this Friday", "next week", "in 2 days", "tonight"). Calculate exact YYYY-MM-DD based on currentDate.
4. If the user mentions a project (e.g. "Work", "Personal", "Groceries"), match it to the project list ID.
5. If details are missing or ambiguous (e.g. no due date, or project isn't clear), ask a friendly clarifying question.
6. When all details are gathered, warmly ask for confirmation before finalizing (e.g. "I've got 'Schedule dental checkup' for this Thursday under Personal. Shall I add that?").
7. When the user confirms (e.g., "yes", "sounds good", "go for it", "please do", "add it"), set isComplete: true, action: 'complete', and give a warm confirmation message.
8. If the user cancels (e.g., "cancel", "never mind", "forget it"), set action: 'cancel', isComplete: false.

Output JSON format (valid JSON only, no markdown wrapping):
{
  "reply": "string (the natural conversational response to speak back)",
  "isComplete": boolean,
  "action": "clarify" | "confirm" | "complete" | "cancel" | "chat",
  "extractedTask": {
    "title": "task title",
    "description": "optional description",
    "dueDate": "YYYY-MM-DD or undefined",
    "projectId": "project id or inbox",
    "priority": "low" | "medium" | "high"
  },
  "suggestedFollowUp": "optional hint"
}`;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        status: 'success',
        reply: parsed.reply || "I've updated your tasks.",
        isComplete: !!parsed.isComplete,
        action: parsed.action || 'chat',
        extractedTask: parsed.extractedTask,
        suggestedFollowUp: parsed.suggestedFollowUp,
      };
    } catch (err) {
      console.warn('Gemini voice dialogue failed or rate-limited; falling back to heuristic engine:', err);
      return HeuristicEngine.handleVoiceDialogue(messages, currentDate, projects);
    }
  }
}

export const geminiService = new GeminiService();

