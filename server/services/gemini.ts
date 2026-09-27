import { GoogleGenAI } from '@google/genai';
import {
  Task,
  WorkloadAnalysisResponse,
  RescheduleSuggestionsResponse,
  DecomposeTaskResponse,
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
}

export const geminiService = new GeminiService();
