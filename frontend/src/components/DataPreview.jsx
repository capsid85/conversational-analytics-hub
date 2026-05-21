import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, Table, ArrowUpDown } from 'lucide-react';

export default function DataPreview({ columns, results }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const itemsPerPage = 8;

  // Reset page when results change
  React.useEffect(() => {
    setCurrentPage(1);
    setSearch('');
    setSortConfig({ key: null, direction: 'asc' });
  }, [results]);

  // Handle Sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and Sort Data
  const processedData = useMemo(() => {
    if (!results) return [];
    
    // 1. Filter
    let filtered = [...results];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      filtered = filtered.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(q)
        );
      });
    }
    
    // 2. Sort
    if (sortConfig.key !== null) {
      const { key, direction } = sortConfig;
      filtered.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (valA === null || valA === undefined) return direction === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return direction === 'asc' ? 1 : -1;

        // If numeric type
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        
        // Alphanumeric fallback
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [results, search, sortConfig]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage]);

  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    
    // Prepare headers
    const csvHeaders = columns.join(',');
    
    // Prepare rows
    const csvRows = results.map(row => {
      return columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '""';
        
        // Escape quotes and wrap strings in quotes
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!results || results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 border-2 border-dashed border-slate-800 rounded-xl">
        <Table className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">No records retrieved or empty dataset returned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Export Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search within results..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500 rounded-lg py-2 pl-9 pr-4 outline-none transition-colors text-xs"
          />
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <span className="text-xs text-slate-400">
            Total records: <strong className="text-indigo-400">{results.length}</strong>
            {processedData.length !== results.length && (
              <span> (filtered to {processedData.length})</span>
            )}
          </span>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-lg transition-colors text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-md">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => requestSort(col)}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-800 hover:text-slate-200 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.replace(/_/g, ' ')}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {paginatedData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-900/40 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-2.5 font-mono">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-slate-600 italic">null</span>
                    ) : typeof row[col] === 'number' && !Number.isInteger(row[col]) ? (
                      row[col].toFixed(2)
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-900 pt-3">
          <span className="text-[11px] text-slate-400">
            Showing <strong className="text-indigo-400">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong className="text-indigo-400">
              {Math.min(currentPage * itemsPerPage, processedData.length)}
            </strong>{" "}
            of <strong className="text-indigo-400">{processedData.length}</strong> entries
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded border transition-colors ${
                currentPage === 1
                  ? 'border-slate-900 text-slate-600 cursor-not-allowed'
                  : 'border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded border transition-colors ${
                currentPage === totalPages
                  ? 'border-slate-900 text-slate-600 cursor-not-allowed'
                  : 'border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
