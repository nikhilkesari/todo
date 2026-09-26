import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

export const AddProjectModal: React.FC = () => {
  const { isProjectModalOpen, setIsProjectModalOpen, addProject, setSelectedProjectId } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isProjectModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newProj = await addProject({
        name: name.trim(),
        color,
        isDefault: false,
      });
      setSelectedProjectId(newProj.id);
      setName('');
      setIsProjectModalOpen(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Create New List</h2>
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              List Name *
            </label>
            <input
              type="text"
              required
              data-testid="project-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vacation Planning"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Color Theme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-700 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="project-submit-btn"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
