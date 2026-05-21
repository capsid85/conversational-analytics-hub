import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, MessageSquare, CornerDownLeft, Loader2, Database } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Compare attrition rate by department",
  "Show average monthly income by job role",
  "Which job roles work the most overtime?",
  "Show average years at company by department"
];

const LOADING_STEPS = [
  "Formulating prompt context...",
  "Translating question to SQLite SQL...",
  "Executing query against HR database...",
  "Running error checks and query safety validation...",
  "Summarizing query results into analytical insights..."
];

export default function ChatPanel({ messages, onSendMessage, isLoading, currentLoadingStepIndex }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handlePromptClick = (prompt) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-slate-100">Analysis Chat</h2>
            <p className="text-[10px] text-slate-400">Conversational AI Database Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-950/40 px-2.5 py-1 rounded-full border border-slate-800/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] text-slate-400 font-mono">HR_DB: Connected</span>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="p-4 bg-indigo-500/5 rounded-full border border-indigo-500/10 text-indigo-400 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Start your analytics journey</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ask questions about employees, attrition rates, monthly incomes, or job levels. The AI converts your questions into optimized queries dynamically.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg border transition-all ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-500 text-white rounded-br-none'
                    : 'bg-slate-950/40 border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="font-mono text-[9px] mb-1 opacity-60 tracking-wider uppercase">
                  {msg.role === 'user' ? 'YOU' : 'AI ENGINE'}
                </div>
                
                {/* Text output */}
                <div className="whitespace-pre-line">
                  {msg.text}
                </div>

                {/* If error message */}
                {msg.role === 'assistant' && msg.error && (
                  <div className="mt-2.5 p-2.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-[10px] font-mono">
                    <p className="font-semibold mb-0.5">Execution Failed</p>
                    <p className="opacity-90">{msg.error_message || msg.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-950/40 border border-slate-800/80 text-slate-200 rounded-2xl rounded-bl-none px-4 py-3.5 shadow-lg max-w-[90%] space-y-2.5 w-full">
              <div className="font-semibold text-[10px] opacity-70 flex items-center space-x-1.5 text-indigo-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>AI Core processing...</span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium">
                {LOADING_STEPS[currentLoadingStepIndex] || "Thinking..."}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${((currentLoadingStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested cards (only show if not loading and input is empty) */}
      {!isLoading && (
        <div className="px-5 py-2.5 bg-slate-950/20 border-t border-slate-900/60">
          <p className="text-[10px] text-indigo-400 font-semibold mb-1.5 tracking-wide uppercase">Quick Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handlePromptClick(prompt)}
                className="text-[10px] px-2.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-slate-200 rounded-lg transition-all duration-200 text-left hover:-translate-y-0.5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask a question about the HR database..."
            className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-slate-200 placeholder-slate-600 rounded-xl py-3 pl-4 pr-12 outline-none transition-all duration-200 text-xs focus:ring-1 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
              input.trim() && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex justify-between items-center px-1 mt-2 text-[9px] text-slate-500 font-mono">
          <span>Remembers context variables</span>
          <span className="flex items-center">
            Enter <CornerDownLeft className="w-2.5 h-2.5 ml-1" />
          </span>
        </div>
      </div>
    </div>
  );
}
