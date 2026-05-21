import React, { useState } from 'react';
import { Terminal, Copy, Check, Info } from 'lucide-react';

export default function SQLPreview({ sql, explanation }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSQL = (code) => {
    if (!code) return '';
    
    // List of key SQL terms to highlight
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 
      'JOIN', 'ON', 'AS', 'AND', 'OR', 'COUNT', 'AVG', 'SUM', 
      'MAX', 'MIN', 'DESC', 'ASC', 'WITH', 'LEFT', 'RIGHT', 'INNER', 'LIKE'
    ];
    
    let html = code;
    
    // Simple string escape/replace keywords
    keywords.forEach(kw => {
      // Use regex with word boundaries
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      html = html.replace(regex, (match) => {
        return `<span class="sql-keyword">${match.toUpperCase()}</span>`;
      });
    });

    // Color string values (e.g. 'Yes', 'Sales')
    html = html.replace(/('([^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');
    // Color numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');

    return html;
  };

  if (!sql) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 border-2 border-dashed border-slate-800 rounded-xl">
        <Terminal className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">Execute a query to preview the generated SQL statement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Code Block Container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-mono font-semibold text-slate-400">Generated SQLite Query</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-100 transition-colors py-1 px-2 rounded hover:bg-slate-800"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Copy SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-x-auto max-h-64 font-mono text-sm leading-relaxed text-slate-300 select-all">
          <pre 
            className="whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }} 
          />
        </div>
      </div>

      {/* Explanation Box */}
      {explanation && (
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3 items-start">
          <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Logic Explanation</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
