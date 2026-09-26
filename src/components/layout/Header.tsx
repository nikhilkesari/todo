import React from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, Plus, Search, Sparkles, CheckSquare } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setIsCreateModalOpen,
    setIsSidebarOpen,
    isAIDrawerOpen,
    setIsAIDrawerOpen,
    taskCounts,
  } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span>TaskFlow<span className="text-brand-600">AI</span></span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* New Task Modal Trigger */}
          <button
            type="button"
            data-testid="open-task-modal-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          {/* AI Drawer Trigger */}
          <button
            type="button"
            data-testid="ai-drawer-trigger"
            onClick={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700 hover:text-brand-700 text-sm font-medium transition-colors"
            title="Open Gemini AI Workload Advisor"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">AI Advisor</span>
            {taskCounts.today > 3 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
