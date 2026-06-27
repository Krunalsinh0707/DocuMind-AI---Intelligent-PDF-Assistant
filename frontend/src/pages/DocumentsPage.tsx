import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  FileText, 
  Trash2, 
  Download, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Search,
  HardDrive
} from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
interface DocumentInfo {
  id: string;
  filename: string;
  upload_timestamp: string;
  file_size_mb: number;
  chunk_count: number;
  chunk_ids: string[];
  status: string;
  pages: number;
  questions_asked: number;
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexingDocIds, setReindexingDocIds] = useState<string[]>([]);
  
  // Search text filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError('Could not retrieve uploaded documents metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDoc = (docId: string) => {
    const url = api.downloadDocumentUrl(docId);
    window.open(url, '_blank');
  };

  const handleReindexDoc = async (docId: string, filename: string) => {
    setReindexingDocIds((prev) => [...prev, docId]);
    try {
      await api.reindexDocument(docId);
      alert(`Successfully reindexed "${filename}".`);
      fetchDocuments();
    } catch (err: any) {
      alert(`Failed to reindex "${filename}".`);
    } finally {
      setReindexingDocIds((prev) => prev.filter((id) => id !== docId));
    }
  };

  const handleDeleteDoc = async (docId: string, filename: string) => {
    if (!window.confirm(`Remove "${filename}" from your personal knowledge base?`)) return;
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filter documents by filename query
  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sum storage used
  const totalStorage = documents.reduce((sum, doc) => sum + (doc.file_size_mb || 0), 0);

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
              My Knowledge Base
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Manage, re-index, download, or delete indexed PDFs that feed your semantic search.
            </p>
          </div>
          
          <div className="kb-pill-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', cursor: 'default', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <HardDrive size={15} style={{ color: 'var(--primary-color)' }} />
            <span>Capacity: <strong>{totalStorage.toFixed(2)} MB</strong> ({documents.length} Files)</span>
          </div>
        </div>

        {error && (
          <div className="login-error-box" style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <p className="login-error-text" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Search & Action Panel */}
        <div className="premium-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '400px', minWidth: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search documents by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.55rem 0.5rem 0.55rem 2.2rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          
          <button 
            onClick={() => navigate('/')} 
            className="kb-pill-btn"
            style={{ background: 'var(--primary-gradient)', border: 'none', color: '#FFFFFF', padding: '0.65rem 1.25rem' }}
          >
            <span>Upload New Document</span>
          </button>
        </div>

        {/* Documents Grid Section */}
        <div style={{ width: '100%' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Loading documents index...</p>
          ) : filteredDocs.length === 0 ? (
            <div className="premium-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <FileText size={44} style={{ opacity: 0.3, marginBottom: '0.75rem', color: 'var(--accent-color)' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                📚 Your knowledge base is waiting.
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.2rem' }}>
                Upload a document and let's start learning together.
              </p>
            </div>
          ) : (
            <div className="doc-card-grid">
              {filteredDocs.map((doc) => {
                const isReindexing = reindexingDocIds.includes(doc.id);
                const sizeFormatted = doc.file_size_mb 
                  ? `${doc.file_size_mb.toFixed(2)} MB`
                  : 'N/A';
                return (
                  <div key={doc.id} className="doc-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <div className="doc-card-header">
                      <div className="doc-card-icon" style={{ background: 'var(--bg-secondary)', color: 'var(--primary-color)' }}>
                        <FileText size={20} />
                      </div>
                      <div className="doc-card-details">
                        <span className="doc-card-title" title={doc.filename} style={{ color: 'var(--text-primary)' }}>{doc.filename}</span>
                        <div className="doc-card-meta" style={{ color: 'var(--text-secondary)' }}>
                          <span>{sizeFormatted}</span>
                          <span>•</span>
                          <span>{doc.pages || 0} pages</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Queries Run:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{doc.questions_asked || 0}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Upload Date:</span>
                        <span>{formatDate(doc.upload_timestamp)}</span>
                      </div>
                    </div>

                    <div className="doc-card-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: doc.status === 'indexed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: doc.status === 'indexed' ? 'var(--success-color)' : 'var(--warning-color)',
                        border: doc.status === 'indexed' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
                      }}>
                        {doc.status}
                      </span>

                      <div className="doc-card-actions">
                        <button 
                          className="action-btn"
                          onClick={() => handleOpenDoc(doc.id)}
                          title="Download / View File"
                          style={{ 
                            background: 'transparent', 
                            border: '1px solid var(--border-color)', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '0.35rem', 
                            borderRadius: '6px',
                            display: 'flex'
                          }}
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleReindexDoc(doc.id, doc.filename)}
                          disabled={isReindexing}
                          title="Reindex Document"
                          style={{ 
                            background: 'transparent', 
                            border: '1px solid var(--border-color)', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '0.35rem', 
                            borderRadius: '6px',
                            display: 'flex'
                          }}
                        >
                          <RefreshCw size={13} className={isReindexing ? 'spin' : ''} />
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                          disabled={isReindexing}
                          title="Remove Document"
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            color: 'var(--danger-color)', 
                            cursor: 'pointer', 
                            padding: '0.35rem', 
                            borderRadius: '6px',
                            display: 'flex'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.2)', backgroundColor: 'var(--user-bubble-bg)', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem' }}>
            <ShieldAlert size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Reindexing a document deletes its chunks from FAISS vector space and parses them again. Use this if queries about the document yield incorrect references or if database configuration changed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
