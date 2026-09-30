import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useVoiceConversation, VoiceState } from '../../hooks/useVoiceConversation';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Send,
  Check,
  Calendar,
  Folder,
  Flag,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const VoiceTaskModal: React.FC = () => {
  const { isVoiceModalOpen, setIsVoiceModalOpen, projects } = useApp();
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const {
    state,
    messages,
    interimTranscript,
    extractedTask,
    errorMessage,
    isSupported,
    toggleMic,
    sendMessage,
    confirmTask,
    resetConversation,
  } = useVoiceConversation(isVoiceModalOpen);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  if (!isVoiceModalOpen) return null;

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toSend = inputText.trim();
    if (!toSend) return;
    setInputText('');
    sendMessage(toSend);
  };


  const getProjectName = (projectId?: string) => {
    if (!projectId || projectId === 'inbox') return 'Inbox';
    const found = projects.find((p) => p.id === projectId);
    return found ? found.name : projectId;
  };

  const renderStatusBadge = (currentState: VoiceState) => {
    switch (currentState) {
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Listening to you...
          </span>
        );
      case 'speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Volume2 className="w-3.5 h-3.5 animate-bounce" />
            Speaking...
          </span>
        );
      case 'thinking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Thinking...
          </span>
        );
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Task Saved!
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Notice
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Ready
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      data-testid="voice-task-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Voice Task Creator
              </h2>
              <p className="text-xs text-slate-500">Conversational AI assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge(state)}
            <button
              type="button"
              data-testid="close-voice-modal-btn"
              onClick={() => setIsVoiceModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close voice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Waveform / Pulsing Visualizer */}
        <div className="relative py-4 px-6 bg-gradient-to-b from-slate-50/50 to-white flex flex-col items-center justify-center border-b border-slate-100">
          <div className="flex items-center justify-center gap-1.5 h-10">
            {[40, 70, 100, 75, 45].map((height, idx) => (
              <div
                key={idx}
                className={cn(
                  'w-1.5 rounded-full transition-all duration-150',
                  state === 'listening'
                    ? 'bg-rose-500 animate-pulse'
                    : state === 'speaking'
                    ? 'bg-indigo-600 animate-pulse'
                    : state === 'thinking'
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
                )}
                style={{
                  height:
                    state === 'listening' || state === 'speaking'
                      ? `${Math.max(12, Math.round(height * (0.6 + Math.random() * 0.4)))}px`
                      : '8px',
                  animationDelay: `${idx * 100}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500 mt-2 font-medium">
            {state === 'listening'
              ? 'Speaking is active — say your task or reply naturally'
              : state === 'speaking'
              ? 'Assistant is speaking'
              : state === 'thinking'
              ? 'Understanding your request...'
              : state === 'complete'
              ? 'Task created successfully!'
              : 'Tap microphone or speak hands-free'}
          </span>
        </div>

        {/* Conversation Chat Stream */}
        <div
          ref={chatScrollRef}
          data-testid="voice-messages-container"
          className="flex-1 p-5 overflow-y-auto space-y-3 min-h-[200px] max-h-[340px] bg-slate-50/40 text-sm"
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-col',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Interim transcript while user speaks */}
          {interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-none px-4 py-2 bg-brand-50 border border-brand-200 text-brand-800 italic text-xs animate-pulse">
                &ldquo;{interimTranscript}...&rdquo;
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Extracted Task Preview Card */}
        {extractedTask && extractedTask.title && (
          <div
            data-testid="voice-task-preview"
            className="px-5 py-3 bg-indigo-50/60 border-t border-b border-indigo-100/80 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 tracking-wider uppercase">
                Task Preview
              </span>
              {state !== 'complete' && (
                <button
                  type="button"
                  data-testid="confirm-voice-task-btn"
                  onClick={confirmTask}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm & Add
                </button>
              )}
            </div>

            <div className="font-semibold text-slate-900 text-sm">{extractedTask.title}</div>

            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              {extractedTask.dueDate && (
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Calendar className="w-3 h-3 text-brand-600" />
                  {extractedTask.dueDate}
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Folder className="w-3 h-3 text-amber-600" />
                {getProjectName(extractedTask.projectId)}
              </span>
              {extractedTask.priority && (
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 capitalize">
                  <Flag className="w-3 h-3 text-red-500" />
                  {extractedTask.priority} priority
                </span>
              )}
            </div>
          </div>
        )}

        {/* Control Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="reset-voice-btn"
              onClick={resetConversation}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Central Mic Button */}
            <button
              type="button"
              data-testid="toggle-voice-mic-btn"
              onClick={toggleMic}
              className={cn(
                'relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95',
                state === 'listening'
                  ? 'bg-rose-500 hover:bg-rose-600 ring-4 ring-rose-200 animate-pulse'
                  : 'bg-brand-600 hover:bg-brand-700 ring-2 ring-brand-100'
              )}
              aria-label={state === 'listening' ? 'Mute microphone' : 'Start talking'}
            >
              {state === 'listening' ? (
                <Mic className="w-7 h-7 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>

            {state === 'complete' ? (
              <button
                type="button"
                data-testid="done-voice-btn"
                onClick={() => setIsVoiceModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            ) : (
              <div className="w-8" />
            )}
          </div>

          {/* Text Input Fallback */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            <input
              type="text"
              data-testid="voice-modal-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isSupported
                  ? 'Or type your reply here (e.g. "Yes, add it")...'
                  : 'Web Speech not supported in this browser — type your reply here...'
              }
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              data-testid="voice-modal-text-send"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
