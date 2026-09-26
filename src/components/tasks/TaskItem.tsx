import React from 'react';
import { Task, Project } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDueDate, checkIsOverdue, checkIsToday } from '../../utils/dateUtils';
import { Calendar, Check, Clock, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TaskItemProps {
  task: Task;
  project?: Project;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, project }) => {
  const { toggleTask, deleteTask, setEditingTask } = useApp();

  const isOverdue = !task.completed && checkIsOverdue(task.dueDate);
  const isToday = checkIsToday(task.dueDate);

  return (
    <div
      data-testid={`task-item-${task.id}`}
      id={`task-item-${task.id}`}
      className={cn(
        'group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 mb-2.5 rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300',
        task.completed ? 'bg-slate-50/70 border-slate-200 opacity-60' : 'border-slate-200'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0 w-full sm:w-auto">
        {/* Completion Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
          data-testid={`task-checkbox-${task.id}`}
          onClick={() => toggleTask(task.id)}
          className={cn(
            'mt-1 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
            task.completed
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'border-slate-300 bg-white hover:border-brand-500'
          )}
        >
          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              data-testid={`task-title-${task.id}`}
              className={cn(
                'font-medium text-slate-800 break-words transition-all text-sm sm:text-base',
                task.completed && 'line-through text-slate-400 opacity-60'
              )}
            >
              {task.title}
            </span>

            {/* Priority Indicator */}
            {task.priority === 'high' && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                High
              </span>
            )}
            {task.priority === 'medium' && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                Med
              </span>
            )}
          </div>

          {task.description && (
            <p
              className={cn(
                'text-xs text-slate-500 mt-1 line-clamp-2',
                task.completed && 'line-through text-slate-400'
              )}
            >
              {task.description}
            </p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-500">
            {/* Project Tag */}
            {project && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </span>
            )}

            {/* Due Date Badge */}
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium',
                  isOverdue
                    ? 'bg-red-50 text-red-700 font-semibold'
                    : isToday
                    ? 'bg-amber-50 text-amber-700 font-semibold'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}

            {/* Estimated Minutes */}
            {task.estimatedMinutes && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 text-slate-400">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 self-end sm:self-center mt-3 sm:mt-0 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          aria-label={`Edit task ${task.title}`}
          data-testid={`task-edit-btn-${task.id}`}
          onClick={() => setEditingTask(task)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete task ${task.title}`}
          data-testid={`task-delete-btn-${task.id}`}
          onClick={() => deleteTask(task.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
