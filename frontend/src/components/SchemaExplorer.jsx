import React, { useState } from 'react';
import { Search, Database, Info, HelpCircle } from 'lucide-react';

const SCHEMA_DATA = [
  {
    category: "Demographics",
    columns: [
      { name: "age", type: "INT", desc: "Age of the employee", examples: "25, 41, 58" },
      { name: "gender", type: "TEXT", desc: "Gender of the employee", examples: "Male, Female" },
      { name: "marital_status", type: "TEXT", desc: "Marital status", examples: "Single, Married, Divorced" },
      { name: "education", type: "INT", desc: "Education level (1: Below College, 5: Doctor)", examples: "1, 2, 3, 4, 5" },
      { name: "education_field", type: "TEXT", desc: "Field of education study", examples: "Life Sciences, Medical, Marketing, Technical Degree" }
    ]
  },
  {
    category: "Job & Compensation",
    columns: [
      { name: "department", type: "TEXT", desc: "Department name", examples: "Sales, Research & Development, Human Resources" },
      { name: "job_role", type: "TEXT", desc: "Specific job title", examples: "Sales Executive, Research Scientist, Software Engineer" },
      { name: "job_level", type: "INT", desc: "Job level (1 lowest, 5 highest)", examples: "1, 2, 3, 4, 5" },
      { name: "monthly_income", type: "INT", desc: "Monthly base income in USD", examples: "$2,000 - $19,999" },
      { name: "hourly_rate", type: "INT", desc: "Hourly pay rate in USD", examples: "$30 - $100" },
      { name: "overtime", type: "TEXT", desc: "Works overtime hours?", examples: "Yes, No" },
      { name: "percent_salary_hike", type: "INT", desc: "Percent increase in salary", examples: "11% - 25%" }
    ]
  },
  {
    category: "History & Tenure",
    columns: [
      { name: "years_at_company", type: "INT", desc: "Years working at this company", examples: "0 - 40 years" },
      { name: "years_in_current_role", type: "INT", desc: "Years in the active job role", examples: "0 - 18 years" },
      { name: "years_since_last_promotion", type: "INT", desc: "Years since employee was promoted", examples: "0 - 15 years" },
      { name: "years_with_curr_manager", type: "INT", desc: "Years reporting to current manager", examples: "0 - 17 years" },
      { name: "total_working_years", type: "INT", desc: "Total career working years", examples: "0 - 40 years" }
    ]
  },
  {
    category: "Feedback & Ratings",
    columns: [
      { name: "attrition", type: "TEXT", desc: "Has the employee left the company? (Target label)", examples: "Yes, No" },
      { name: "environment_satisfaction", type: "INT", desc: "Work environment rating (1: Low, 4: Very High)", examples: "1, 2, 3, 4" },
      { name: "job_satisfaction", type: "INT", desc: "Job satisfaction rating (1: Low, 4: Very High)", examples: "1, 2, 3, 4" },
      { name: "performance_rating", type: "INT", desc: "Performance score (3: Excellent, 4: Outstanding)", examples: "3, 4" },
      { name: "work_life_balance", type: "INT", desc: "Work-life balance rating (1: Bad, 4: Best)", examples: "1, 2, 3, 4" },
      { name: "relationship_satisfaction", type: "INT", desc: "Peer relationship rating (1: Low, 4: High)", examples: "1, 2, 3, 4" }
    ]
  }
];

export default function SchemaExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('Job & Compensation');

  const filteredSchema = SCHEMA_DATA.map(cat => {
    const filteredCols = cat.columns.filter(col => 
      col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, columns: filteredCols };
  }).filter(cat => cat.columns.length > 0);

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center space-x-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-100">Database Schema Dictionary</h3>
          <p className="text-[10px] text-slate-400">employees table catalog & value rules</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/40">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search columns or descriptions..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 placeholder-slate-500 rounded-lg py-1.5 pl-8 pr-3 outline-none transition-colors text-xs"
          />
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSchema.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No columns match your search term.
          </div>
        ) : (
          filteredSchema.map((cat, idx) => {
            const isExpanded = expandedCategory === cat.category || searchQuery !== '';
            return (
              <div 
                key={idx}
                className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-950/20"
              >
                {/* Accordion Title */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? '' : cat.category)}
                  className="w-full px-4 py-2.5 bg-slate-900/30 hover:bg-slate-900/60 transition-colors flex items-center justify-between text-left text-xs font-semibold text-indigo-400 uppercase tracking-wide border-b border-slate-900"
                >
                  <span>{cat.category}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({cat.columns.length})</span>
                </button>

                {/* Accordion Columns */}
                {isExpanded && (
                  <div className="divide-y divide-slate-900 bg-slate-950/50 p-2 space-y-1">
                    {cat.columns.map((col, colIdx) => (
                      <div 
                        key={colIdx}
                        className="p-2.5 hover:bg-slate-900/40 rounded-lg transition-all flex flex-col space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-200 font-semibold">{col.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 font-mono rounded">
                            {col.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{col.desc}</p>
                        
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                          <span className="text-emerald-500/80 font-bold uppercase tracking-wider">Ref:</span>
                          <span className="truncate">{col.examples}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Schema note */}
      <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex gap-2.5 items-start">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          AI uses this vocabulary mapping schema. For example, queries like <em>"attrition rate"</em> will evaluate the <code>attrition</code> flag ratios.
        </p>
      </div>
    </div>
  );
}
