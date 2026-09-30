import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority } from '../../types';
import { getTodayDateString } from '../../utils/dateUtils';
import { Plus, Calendar, Flag, Mic } from 'lucide-react';
import { cn } from '../../utils/cn';

export const QuickAddTask: React.FC = () => {
  const { addTask, selectedProjectId, quickFilter, setIsVoiceModalOpen } = useApp();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>(
    quickFilter === 'today' ? getTodayDateString() : ''
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addTask({
        title: title.trim(),
        priority,
        dueDate: dueDate || (quickFilter === 'today' ? getTodayDateString() : undefined),
        projectId: selectedProjectId || 'inbox',
        completed: false,
        complexity: 'low',
      });
      setTitle('');
      if (quickFilter !== 'today') {
        setDueDate('');
      }
      setPriority('medium');
      setIsExpanded(false);
    } catch (err) {
      console.error('Failed to quick add task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 mb-6 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100',
        isExpanded ? 'p-4' : 'p-2 sm:p-3'
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          data-testid="quick-add-input"
          placeholder="What needs to be done? Press Enter to save..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          className="flex-1 bg-transparent px-2 py-1 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        <button
          type="button"
          data-testid="quick-add-voice-btn"
          onClick={() => setIsVoiceModalOpen(true)}
          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Add task with Voice"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          type="submit"
          data-testid="quick-add-submit"
          disabled={!title.trim() || isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>

      </div>

      {isExpanded && (
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Due Date picker */}
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none text-xs"
              />
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-md border border-slate-200">
              <Flag className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                    priority === p
                      ? p === 'high'
                        ? 'bg-red-500 text-white'
                        : p === 'medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-slate-400 hover:text-slate-600 text-xs"
          >
            Collapse
          </button>
        </div>
      )}
    </form>
  );
};
