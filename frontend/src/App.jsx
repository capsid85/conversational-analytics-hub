import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Sparkles, AlertCircle, BarChart3, Table, Terminal, 
  HelpCircle, Activity, History, BookOpen, RefreshCw, CheckCircle2, XCircle, Search 
} from 'lucide-react';
import ChatPanel from './components/ChatPanel';
import SQLPreview from './components/SQLPreview';
import DataPreview from './components/DataPreview';
import Visualization from './components/Visualization';
import SchemaExplorer from './components/SchemaExplorer';
import SkeletonLoader from './components/SkeletonLoader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedMsgIdx, setSelectedMsgIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // insights, table, sql
  const [sidebarTab, setSidebarTab] = useState('workspace'); // workspace, schema, logs
  
  const [stats, setStats] = useState({
    total_employees: '---',
    attrition_rate: '---',
    average_income: '---',
    total_departments: '---'
  });
  const [statsError, setStatsError] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');

  // Fetch Database Stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsError(false);
      const res = await axios.get(`${API_BASE}/api/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch database statistics:", err);
      setStatsError(true);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await axios.get(`${API_BASE}/api/logs`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch logs whenever user toggles to the logs tab
  useEffect(() => {
    if (sidebarTab === 'logs') {
      fetchLogs();
    }
  }, [sidebarTab]);

  // Simulate loading stages in UI
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 1800);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSendMessage = async (text) => {
    // 1. Append User Message
    const userMsg = { role: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setLoadingStep(0);

    // 2. Format history for payload
    const historyPayload = messages
      .filter((m) => !m.error)
      .map((m) => ({
        role: m.role,
        question: m.role === 'user' ? m.text : undefined,
        sql_query: m.role === 'assistant' ? m.sql_query : undefined
      }));

    try {
      const response = await axios.post(`${API_BASE}/api/query`, {
        question: text,
        history: historyPayload
      });

      const data = response.data;
      
      let botMsg = {};
      if (data.success) {
        botMsg = {
          role: 'assistant',
          text: data.summary,
          sql_query: data.sql_query,
          sql_explanation: data.sql_explanation,
          results: data.results,
          columns: data.columns,
          error: false
        };
      } else {
        botMsg = {
          role: 'assistant',
          text: `I generated a query but ran into a verification error.`,
          sql_query: data.sql_query,
          error: true,
          error_message: data.message || 'Safety validation failure.'
        };
      }

      setMessages((prev) => [...prev, botMsg]);
      setSelectedMsgIdx(newMessages.length); // Focus on this bot answer index
      setActiveTab('insights'); // reset active tab to insights
      
      // Auto refresh logs list if in logs tab
      if (sidebarTab === 'logs') {
        fetchLogs();
      }
    } catch (error) {
      console.error("Connection error:", error);
      const botMsg = {
        role: 'assistant',
        text: "I was unable to reach the AI Server. Please ensure the backend is running and that your Gemini API key is configured correctly in `.env`.",
        error: true,
        error_message: error.message
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract selected message data
  const selectedMsg = selectedMsgIdx !== null ? messages[selectedMsgIdx] : null;

  // Filter logs for search
  const filteredLogs = logs.filter(log => 
    log.question.toLowerCase().includes(logsSearch.toLowerCase()) ||
    log.sql_query.toLowerCase().includes(logsSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-300 antialiased selection:bg-indigo-500/30 selection:text-white"
         style={{
           backgroundImage: 'radial-gradient(circle at 50% 0px, rgba(99, 102, 241, 0.05) 0%, transparent 50%)'
         }}>
      
      {/* 1. Sleek Icon Sidebar Navigation */}
      <aside className="w-16 border-r border-slate-900 bg-slate-950 flex flex-col items-center py-6 justify-between shrink-0">
        <div className="flex flex-col items-center space-y-8 w-full">
          {/* Logo Icon */}
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 text-white animate-pulse">
            <Database className="w-5 h-5" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-4 w-full px-2">
            <button
              onClick={() => setSidebarTab('workspace')}
              title="Analysis Workspace"
              className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                sidebarTab === 'workspace'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSidebarTab('schema')}
              title="Schema Dictionary"
              className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                sidebarTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSidebarTab('logs')}
              title="Query Logs Audit"
              className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                sidebarTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <History className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Connection Health Indicator */}
        <button
          onClick={fetchStats}
          title="DB Connection Health"
          className="p-3 text-emerald-500 hover:bg-slate-900/50 rounded-xl transition-colors"
        >
          <Activity className="w-4 h-4 animate-pulse" />
        </button>
      </aside>

      {/* 2. Main Workstation */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="border-b border-slate-900 bg-slate-950/40 backdrop-blur px-8 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">Enterprise Analytics Hub</h1>
              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-bold rounded border border-indigo-500/20 uppercase tracking-widest">
                Gemini v1.5
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">IBM HR Attrition Database Business Intelligence Gateway</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800/40">
              API Server: active
            </span>
          </div>
        </header>

        {/* Database Summary KPI Stats */}
        <section className="px-8 pt-5 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl">
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl px-4.5 py-3.5 flex flex-col justify-center transition-all hover:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Headcount</span>
              <span className="text-xl font-bold text-slate-100 mt-1">{stats.total_employees}</span>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-xl px-4.5 py-3.5 flex flex-col justify-center transition-all hover:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Attrition Rate</span>
              <span className="text-xl font-bold text-emerald-400 mt-1">{stats.attrition_rate}</span>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-xl px-4.5 py-3.5 flex flex-col justify-center transition-all hover:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Avg Monthly Income</span>
              <span className="text-xl font-bold text-slate-100 mt-1">{stats.average_income}</span>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-xl px-4.5 py-3.5 flex flex-col justify-center transition-all hover:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Departments</span>
              <span className="text-xl font-bold text-indigo-400 mt-1">{stats.total_departments}</span>
            </div>
          </div>
        </section>

        {/* Content Router based on sidebar selection */}
        <div className="flex-1 px-8 py-5 min-h-0">
          
          {/* Workspace Tab View */}
          {sidebarTab === 'workspace' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[450px]">
              {/* Left Column: Chat */}
              <div className="lg:col-span-5 h-full min-h-[350px]">
                <ChatPanel 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading}
                  currentLoadingStepIndex={loadingStep}
                />
              </div>

              {/* Right Column: Visual Sandbox */}
              <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                
                {/* Tab selector */}
                <div className="px-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between h-13 shrink-0">
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => setActiveTab('insights')}
                      disabled={isLoading || !selectedMsg || selectedMsg.error}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                        activeTab === 'insights'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Insights & Chart</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('table')}
                      disabled={isLoading || !selectedMsg || selectedMsg.error || !selectedMsg.results}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                        activeTab === 'table'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Data Grid</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('sql')}
                      disabled={isLoading || !selectedMsg || !selectedMsg.sql_query}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                        activeTab === 'sql'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>SQL Console</span>
                    </button>
                  </div>
                  
                  <div className="text-[10px] text-slate-500 font-mono tracking-wider">
                    {selectedMsg ? `ANALYSIS NODE #${selectedMsgIdx + 1}` : 'STANDBY'}
                  </div>
                </div>

                {/* Panel Viewer Area */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-slate-950/20">
                  {isLoading ? (
                    /* Pulsing skeletons during API execution */
                    <SkeletonLoader type={activeTab} />
                  ) : !selectedMsg ? (
                    /* Ready placeholder */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-full text-slate-500">
                        <BarChart3 className="w-7 h-7" />
                      </div>
                      <div className="max-w-xs space-y-1.5">
                        <h4 className="text-xs font-semibold text-slate-300">Insights Workspace Standby</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Submit a query in the chat assistant. Structured graphs, tables, and AI explanations will dynamically populate here.
                        </p>
                      </div>
                    </div>
                  ) : selectedMsg.error ? (
                    /* Error card */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                      <div className="max-w-md space-y-2.5">
                        <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Query Analysis Stopped</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          SQLite execution reported a compilation or semantic failure:
                        </p>
                        <div className="p-3 bg-red-950/25 border border-red-900/30 text-red-300 rounded-xl text-[10px] font-mono text-left max-h-36 overflow-y-auto">
                          {selectedMsg.error_message}
                        </div>
                        {selectedMsg.sql_query && (
                          <div className="text-left pt-2">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Generated Draft Query:</p>
                            <pre className="bg-slate-950 p-2 border border-slate-900 rounded-lg font-mono text-[9px] text-slate-400 overflow-x-auto">
                              {selectedMsg.sql_query}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Render content based on tab selection */
                    <div className="space-y-6">
                      {activeTab === 'insights' && (
                        <div className="space-y-6">
                          {/* AI Analytical insight bubble */}
                          <div className="p-4 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-2xl shadow-inner">
                            <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI Executive Summary</span>
                            </h3>
                            <p className="text-xs text-slate-200 leading-relaxed italic">
                              "{selectedMsg.text}"
                            </p>
                          </div>
                          
                          {/* Visualization canvas */}
                          <div className="border border-slate-800 bg-slate-950/30 rounded-2xl p-4.5">
                            <Visualization 
                              columns={selectedMsg.columns} 
                              results={selectedMsg.results} 
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === 'table' && (
                        <div className="border border-slate-850 bg-slate-950/30 rounded-2xl p-4.5">
                          <DataPreview 
                            columns={selectedMsg.columns} 
                            results={selectedMsg.results} 
                          />
                        </div>
                      )}

                      {activeTab === 'sql' && (
                        <SQLPreview 
                          sql={selectedMsg.sql_query} 
                          explanation={selectedMsg.sql_explanation} 
                        />
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Schema Explorer Tab View */}
          {sidebarTab === 'schema' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[450px]">
              {/* Left pane: schema dictionary */}
              <div className="lg:col-span-5 h-full">
                <SchemaExplorer />
              </div>

              {/* Right pane: visual reference preview of last execution */}
              <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl p-6 justify-center items-center text-center">
                <Database className="w-12 h-12 text-slate-700 mb-4 animate-bounce" />
                <h3 className="text-sm font-semibold text-slate-300">Active Database Schema</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                  Use this vocabulary explorer to identify column tokens (e.g. <code>monthly_income</code>, <code>attrition</code>, <code>overtime</code>) to build precise analytical requests.
                </p>
              </div>
            </div>
          )}

          {/* Query Audit Logs Tab View */}
          {sidebarTab === 'logs' && (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl shadow-2xl p-6 h-full flex flex-col overflow-hidden backdrop-blur-md">
              {/* Filter and controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-slate-800/60 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Query History Audit Log</h3>
                  <p className="text-[10px] text-slate-500">Realtime logs of execution health, safety parsing, and query performance metrics</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search query text or SQL..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 placeholder-slate-600 text-xs rounded-lg py-1.5 pl-8 pr-3 outline-none focus:border-indigo-500 transition-colors w-full sm:w-56"
                    />
                  </div>
                  <button
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Logs Grid Table */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950/20 rounded-xl border border-slate-900">
                {isLoadingLogs ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading audit history logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No matching audit logs found.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-mono text-[10px] tracking-wider uppercase">
                        <th className="p-3 w-12 text-center">Status</th>
                        <th className="p-3">User Inquiry</th>
                        <th className="p-3">Generated SQL Query</th>
                        <th className="p-3 w-32">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 font-medium">
                      {filteredLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-900/20 transition-all text-slate-300">
                          <td className="p-3 text-center">
                            {log.status === 'success' ? (
                              <span className="inline-flex p-1 bg-emerald-500/10 text-emerald-400 rounded-full" title="Success">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex p-1 bg-red-500/10 text-red-400 rounded-full" title={log.error_message || "Execution Fail"}>
                                <XCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                          <td className="p-3 truncate max-w-xs">{log.question}</td>
                          <td className="p-3 font-mono text-[10px] text-indigo-300 truncate max-w-sm select-all">
                            {log.sql_query}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">
                            {new Date(log.timestamp + 'Z').toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Global Footer */}
        <footer className="py-3 border-t border-slate-900 text-center text-[9px] text-slate-600 bg-slate-950/60 shrink-0">
          <p>© 2026 Corporate Human Resources Intelligence Bureau. Powered by Gemini Flash 1.5 & FastAPI.</p>
        </footer>
      </div>

    </div>
  );
}
