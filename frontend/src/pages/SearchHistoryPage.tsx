import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  Calendar, 
  FileText, 
  Download, 
  X, 
  ChevronRight,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
interface SearchEntry {
  id: string;
  query: string;
  timestamp: string;
  session_id: string | null;
  document_id: string | null;
  document_name: string | null;
  session_title: string | null;
}

export default function SearchHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [textFilter, setTextFilter] = useState('');
  const [docFilter, setDocFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection state for batch deletes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const historyData = await api.getSearchHistory();
      setHistory(historyData || []);
      const docsData = await api.getDocuments();
      setDocuments(docsData || []);
    } catch (err: any) {
      console.error("Failed to load search history:", err);
      setError("Failed to retrieve search history records.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        query: textFilter || undefined,
        document_id: docFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };
      const filtered = await api.getSearchHistory(params);
      setHistory(filtered || []);
      setSelectedIds([]);
    } catch (err) {
      setError("Failed to apply filters.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = async () => {
    setTextFilter('');
    setDocFilter('');
    setStartDate('');
    setEndDate('');
    setLoading(true);
    try {
      const allHistory = await api.getSearchHistory();
      setHistory(allHistory || []);
      setSelectedIds([]);
    } catch (err) {
      setError("Failed to clear filters.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (entryId: string) => {
    if (!window.confirm("Delete this entry from your search history?")) return;
    try {
      await api.deleteSearchHistoryEntry(entryId);
      setHistory((prev) => prev.filter(item => item.id !== entryId));
      setSelectedIds((prev) => prev.filter(id => id !== entryId));
    } catch (err) {
      alert("Failed to delete search history entry.");
    }
  };

  const handleToggleSelect = (entryId: string) => {
    if (selectedIds.includes(entryId)) {
      setSelectedIds(prev => prev.filter(id => id !== entryId));
    } else {
      setSelectedIds(prev => [...prev, entryId]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map(item => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected entries?`)) return;
    
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await api.deleteSearchHistoryEntry(id);
      }
      setHistory(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      alert("Selected entries deleted successfully.");
    } catch (err) {
      alert("An error occurred while deleting entries. Some items may not have been removed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire search history? This action is permanent and cannot be undone.")) return;
    setLoading(true);
    try {
      await api.clearSearchHistory();
      setHistory([]);
      setSelectedIds([]);
      alert("Search history cleared successfully.");
    } catch (err) {
      alert("Failed to clear search history.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,ID,Query,Timestamp,Related Document,Session Title\n";
    
    // Rows
    history.forEach(item => {
      const queryEscaped = `"${item.query.replace(/"/g, '""')}"`;
      const docEscaped = `"${(item.document_name || "Global Search").replace(/"/g, '""')}"`;
      const sessionEscaped = `"${(item.session_title || "N/A").replace(/"/g, '""')}"`;
      csvContent += `${item.id},${queryEscaped},${item.timestamp},${docEscaped},${sessionEscaped}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `documind_search_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10, paddingBottom: '3rem' }}>
        
        {/* Header Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={() => navigate('/')}
            className="kb-pill-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Workspace</span>
          </button>
          <ThemeSwitcher />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 className="login-app-title" style={{ fontSize: '2rem', textAlign: 'left', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Search History
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Review, filter, and manage previous searches and question logs.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={handleExportCSV}
              disabled={history.length === 0}
              className="kb-pill-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={handleClearAll}
              disabled={history.length === 0}
              className="kb-pill-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: 'var(--danger-color)' }}
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="login-error-box" style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <p className="login-error-text" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Filters Panel */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Filter size={16} style={{ color: 'var(--primary-color)' }} />
            Filter Search Logs
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Text input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Query Keywords</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  placeholder="Type search terms..."
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.5rem 0.45rem 2rem', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Document select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Specific Document</label>
              <select 
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="">All Documents</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.filename}</option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>From Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            {/* End date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>To Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.5rem', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={handleResetFilters}
              className="kb-pill-btn" 
              style={{ border: '1px solid var(--border-color)', background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
            >
              <span>Reset Filters</span>
            </button>
            <button 
              type="button" 
              onClick={handleApplyFilters}
              className="kb-pill-btn" 
              style={{ background: 'var(--primary-gradient)', border: 'none', color: '#FFFFFF' }}
            >
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.75rem 1.25rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: 600 }}>{selectedIds.length} items selected</span>
              <button 
                onClick={handleDeleteSelected}
                className="kb-pill-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--danger-color)', border: 'none', color: '#FFFFFF', padding: '0.4rem 0.8rem' }}
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto', width: '100%' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Updating records list...</p>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                <Search size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>No search history entries found.</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>Try modifying filters or ask a question in chat workspace.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ width: '40px', padding: '0.75rem' }}>
                      <button 
                        onClick={handleToggleSelectAll}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex' }}
                      >
                        {selectedIds.length === history.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th style={{ padding: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Query / Question</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Related Document</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Timestamp</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, width: '60px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr 
                        key={item.id} 
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', backgroundColor: isSelected ? 'var(--hover-bg)' : 'transparent' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '0.75rem' }}>
                          <button 
                            onClick={() => handleToggleSelect(item.id)}
                            style={{ background: 'transparent', border: 'none', color: isSelected ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.query}>
                          {item.query}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.document_name ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={item.document_name}>
                              <FileText size={12} style={{ color: 'var(--primary-color)' }} />
                              <span>{item.document_name}</span>
                            </span>
                          ) : (
                            <span style={{ opacity: 0.5 }}>Global Search</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <div>{formatDate(item.timestamp)}</div>
                          <div style={{ opacity: 0.6 }}>{formatTime(item.timestamp)}</div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeleteSingle(item.id)}
                            title="Delete entry"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', padding: '0.25rem', borderRadius: '4px' }}
                            className="delete-icon-btn"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
