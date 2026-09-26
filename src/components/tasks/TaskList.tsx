import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskItem } from './TaskItem';
import { CheckCircle2, Inbox } from 'lucide-react';

export const TaskList: React.FC = () => {
  const { filteredTasks, projects, quickFilter, searchQuery } = useApp();

  const projectMap = React.useMemo(() => {
    const map = new Map();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  if (filteredTasks.length === 0) {
    return (
      <div
        data-testid="empty-tasks-state"
        className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50"
      >
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          {quickFilter === 'completed' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Inbox className="w-6 h-6" />
          )}
        </div>
        <h3 className="text-base font-medium text-slate-700">No tasks found</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          {searchQuery
            ? `No tasks matching "${searchQuery}"`
            : quickFilter === 'today'
            ? 'Nothing scheduled for today. Enjoy your day or add a new task!'
            : quickFilter === 'overdue'
            ? 'Great job! No overdue tasks.'
            : 'Get started by creating your first task above.'}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="task-list" className="space-y-2">
      {filteredTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          project={projectMap.get(task.projectId)}
        />
      ))}
    </div>
  );
};
