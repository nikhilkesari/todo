import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority, Complexity } from '../../types';
import { getTodayDateString } from '../../utils/dateUtils';
import { X } from 'lucide-react';

export const EditTaskModal: React.FC = () => {
  const {
    editingTask,
    setEditingTask,
    isCreateModalOpen,
    setIsCreateModalOpen,
    addTask,
    updateTask,
    projects,
    selectedProjectId,
  } = useApp();

  const isOpen = Boolean(editingTask) || isCreateModalOpen;
  const isEditing = Boolean(editingTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('inbox');
  const [priority, setPriority] = useState<Priority>('medium');
  const [complexity, setComplexity] = useState<Complexity>('low');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setDueDate(editingTask.dueDate || '');
      setProjectId(editingTask.projectId || 'inbox');
      setPriority(editingTask.priority || 'medium');
      setComplexity(editingTask.complexity || 'low');
      setEstimatedMinutes(editingTask.estimatedMinutes);
    } else if (isCreateModalOpen) {
      setTitle('');
      setDescription('');
      setDueDate(getTodayDateString());
      setProjectId(selectedProjectId || 'inbox');
      setPriority('medium');
      setComplexity('low');
      setEstimatedMinutes(undefined);
    }
  }, [editingTask, isCreateModalOpen, selectedProjectId]);

  const handleClose = () => {
    setEditingTask(null);
    setIsCreateModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (isEditing && editingTask) {
        await updateTask({
          id: editingTask.id,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          projectId,
          priority,
          complexity,
          estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        });
      } else {
        await addTask({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          projectId,
          priority,
          complexity,
          estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
          completed: false,
        });
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="task-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              data-testid="task-modal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete quarterly review presentation"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              data-testid="task-modal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add relevant notes, links, or criteria..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                data-testid="task-modal-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>

            {/* Project / List */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Project / List
              </label>
              <select
                data-testid="task-modal-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                data-testid="task-modal-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Complexity (AI readiness) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Complexity
              </label>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as Complexity)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Estimated Minutes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                step="5"
                placeholder="e.g. 30"
                value={estimatedMinutes !== undefined ? estimatedMinutes : ''}
                onChange={(e) =>
                  setEstimatedMinutes(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="task-modal-submit"
              disabled={!title.trim() || isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
