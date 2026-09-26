import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, X, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AIAssistantDrawer: React.FC = () => {
  const { isAIDrawerOpen, setIsAIDrawerOpen, taskCounts, tasks, batchReschedule } = useApp();

  if (!isAIDrawerOpen) return null;

  const isOvercommitted = taskCounts.today >= 4;

  const handleQuickRebalance = async () => {
    // Rebalance: move lowest priority today tasks to tomorrow
    const todayTasks = tasks.filter((t) => !t.completed && t.dueDate && t.priority === 'low');
    if (todayTasks.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const suggestions = todayTasks.map((t) => ({ taskId: t.id, newDueDate: tomorrowStr }));
      await batchReschedule(suggestions);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="AI Workload Advisor"
      data-testid="ai-drawer-panel"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-indigo-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">AI Workload Advisor</h2>
            <p className="text-xs text-slate-500">Gemini-powered task intelligence</p>
          </div>
        </div>

        <button
          type="button"
          data-testid="ai-drawer-close"
          aria-label="Close"
          onClick={() => setIsAIDrawerOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status card / summary */}
        <div
          data-testid={isOvercommitted ? 'overcommitment-banner' : 'ai-workload-summary'}
          className={cn(
            'p-4 rounded-xl border text-sm',
            isOvercommitted
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          )}
        >
          <div className="flex items-center gap-2 font-semibold">
            {isOvercommitted ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Overcommitment Detected</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Workload Balanced</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs opacity-90">
            {isOvercommitted
              ? `You have ${taskCounts.today} tasks due today. Consider rescheduling lower priority items to avoid burnout.`
              : `Your schedule looks optimal with ${taskCounts.today} tasks due today.`}
          </p>
          {isOvercommitted && (
            <button
              type="button"
              data-testid="ai-apply-reschedule-btn"
              onClick={handleQuickRebalance}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Rebalance to Tomorrow
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 7-day Breakdown / Capacity visualizer */}
        <div data-testid="capacity-visualizer">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Schedule Overview
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Today's Focus
              </span>
              <span className="font-semibold text-slate-900">{taskCounts.today} tasks</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Upcoming
              </span>
              <span className="font-semibold text-slate-900">{taskCounts.upcoming} tasks</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Overdue
              </span>
              <span className={cn('font-semibold', taskCounts.overdue > 0 ? 'text-red-600' : 'text-slate-900')}>
                {taskCounts.overdue} tasks
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
