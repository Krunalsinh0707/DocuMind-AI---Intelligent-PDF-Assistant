import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { 
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  History, 
  HardDrive, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Search,
  Sparkles,
  BookOpen,
  FileQuestion,
  HelpCircle
} from 'lucide-react';

interface DashboardData {
  total_documents: number;
  total_searches: number;
  total_chats: number;
  storage_used_mb: number;
  recent_documents: Array<{
    id: string;
    filename: string;
    upload_timestamp: string;
    file_size_mb: number;
    pages: number;
    questions_asked: number;
    status: string;
  }>;
  recent_conversations: Array<{
    id: string;
    title: string;
    updated_at: string;
    is_pinned: boolean;
  }>;
  recent_searches: Array<{
    id: string;
    query: string;
    timestamp: string;
    document_name: string | null;
  }>;
  usage_analytics: Array<{
    date: string;
    count: number;
  }>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const stats = await api.getDashboard();
        setData(stats);
      } catch (err: any) {
        console.error("Failed to load dashboard metrics:", err);
        setError("Could not retrieve statistics from backend.");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const handleLaunchPrompt = (promptText: string) => {
    navigate('/', { state: { initialPrompt: promptText } });
  };

  if (loading) {
    return (
      <div className="fullscreen-loading" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="spinner-container">
          <div className="spinner-ring" style={{ borderTopColor: 'var(--primary-color)' }}></div>
          <p className="loading-text" style={{ color: 'var(--text-secondary)' }}>Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  // Find max count in analytics to scale SVG chart
  const maxAnalyticsCount = data?.usage_analytics.reduce((max, d) => d.count > max ? d.count : max, 0) || 0;
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 30;

  const suggestedPrompts = [
    {
      title: "Summarize document",
      desc: "Get key takeaways and structured summaries.",
      prompt: "Summarize this document and list the 5 most important takeaways."
    },
    {
      title: "Generate interview Qs",
      desc: "Produce 10 relevant questions with answers.",
      prompt: "Generate 10 relevant interview questions and answers based on this document."
    },
    {
      title: "Create study notes",
      desc: "Generate clean cheat sheets and lecture summaries.",
      prompt: "Create structured study notes and a cheat sheet based on this document."
    },
    {
      title: "Extract key insights",
      desc: "Synthesize tech contributions and findings.",
      prompt: "Extract the core insights, findings, and contributions of this document."
    },
    {
      title: "Find topics & terms",
      desc: "Map terminologies and core concepts.",
      prompt: "Analyze this document and map out the key topics, concepts, and terminologies."
    },
    {
      title: "Generate MCQs test",
      desc: "Create 5 multiple choice questions.",
      prompt: "Generate 5 multiple-choice questions (MCQs) with answers based on this document."
    }
  ];

  return (
    <div className="page-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10, paddingBottom: '3rem' }}>
        
        {/* Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <button 
            onClick={() => navigate('/')}
            className="kb-pill-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: 600, borderRadius: '9999px', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Workspace</span>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeSwitcher />
            <button 
              onClick={() => navigate('/profile')}
              className="kb-pill-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: 600, borderRadius: '9999px', cursor: 'pointer' }}
            >
              <span>My Profile</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="premium-card" style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--card-bg)', padding: '2.25rem', borderLeft: '4px solid var(--accent-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Welcome Back, {user?.displayName || 'Researcher'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0, fontWeight: 500 }}>
            AI-Powered Document Intelligence Platform. Index PDFs, query findings, and synthesize research instantly.
          </p>
        </div>

        {error && (
          <div className="login-error-box" style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <p className="login-error-text" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Quick Statistics Stats Cards Row */}
        <div className="stat-card-grid">
          
          {/* Docs Count */}
          <div className="premium-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Documents Uploaded</span>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--soft-accent-bg)' }}>
                <FileText size={18} style={{ color: 'var(--primary-color)' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0 0' }}>{data?.total_documents || 0}</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PDF sources indexed</span>
          </div>

          {/* Sessions Count */}
          <div className="premium-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Chats</span>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--soft-accent-bg)' }}>
                <MessageSquare size={18} style={{ color: 'var(--accent-color)' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0 0' }}>{data?.total_chats || 0}</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Saved conversations</span>
          </div>

          {/* Searches Count */}
          <div className="premium-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Questions Asked</span>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--soft-accent-bg)' }}>
                <History size={18} style={{ color: 'var(--warning-color)' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0 0' }}>{data?.total_searches || 0}</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Queries processed</span>
          </div>

          {/* Storage Used */}
          <div className="premium-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Storage Used</span>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--soft-accent-bg)' }}>
                <HardDrive size={18} style={{ color: 'var(--success-color)' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0 0' }}>{data?.storage_used_mb || 0} MB</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Capacity consumed</span>
          </div>

        </div>

        {/* Suggested Quick Prompt Templates */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2rem 0 1rem 0', letterSpacing: '-0.01em' }}>
          Suggested Quick Prompts
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {suggestedPrompts.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => handleLaunchPrompt(item.prompt)}
              className="premium-card" 
              style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--card-bg)', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  <Sparkles size={14} />
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{item.title}</h4>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
              <span style={{ fontSize: '0.725rem', color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.1rem', marginTop: 'auto' }}>
                Launch prompt <ChevronRight size={12} />
              </span>
            </div>
          ))}
        </div>

        {/* Activity & Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
          
          <div className="premium-card" style={{ width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-color)' }} />
                7-Day Inquiries Activity
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-color)' }}>
                Questions per day
              </span>
            </div>

            {/* SVG Visual Graph */}
            <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center', minHeight: '190px' }}>
              {data?.usage_analytics && data.usage_analytics.length > 0 ? (
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ maxWidth: '650px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '10px' }}>
                  <defs>
                    <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-color)" strokeWidth={1} />
                  <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--bg-secondary)" strokeWidth={1} />
                  <line x1={padding} y1={(chartHeight - padding * 2) / 2 + padding} x2={chartWidth - padding} y2={(chartHeight - padding * 2) / 2 + padding} stroke="var(--bg-secondary)" strokeWidth={1} />

                  {/* Generate Path Coordinates */}
                  {(() => {
                    const points = data.usage_analytics.map((val, idx) => {
                      const x = padding + (idx * (chartWidth - padding * 2)) / (data.usage_analytics.length - 1);
                      const heightRange = chartHeight - padding * 2;
                      const y = maxAnalyticsCount > 0 
                        ? chartHeight - padding - (val.count / maxAnalyticsCount) * heightRange
                        : chartHeight - padding;
                      return { x, y, count: val.count, date: val.date };
                    });

                    // Construct Path
                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPath = maxAnalyticsCount > 0 
                      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
                      : '';

                    return (
                      <>
                        {/* Area Gradient */}
                        {areaPath && <path d={areaPath} fill="url(#chartGlow)" />}
                        
                        {/* Smooth Line */}
                        <path d={linePath} fill="none" stroke="var(--accent-color)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Points & Labels */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r={4.5} fill="var(--accent-color)" stroke="var(--card-bg)" strokeWidth={1.5} />
                            
                            {/* Hover tooltip representation */}
                            <text x={p.x} y={p.y - 8} fontSize={9} fill="var(--text-primary)" textAnchor="middle" fontWeight="bold">
                              {p.count > 0 ? p.count : ''}
                            </text>
                            
                            {/* Date text on X-axis */}
                            <text x={p.x} y={chartHeight - 8} fontSize={8} fill="var(--text-secondary)" textAnchor="middle">
                              {p.date}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No analytics data generated yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Detailed Dashboard Activity Lists */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Recent Documents */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <FileText size={18} style={{ color: 'var(--danger-color)' }} />
                Recent Documents
              </h3>
              <button 
                onClick={() => navigate('/documents')} 
                style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <span>See All</span>
                <ChevronRight size={12} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.recent_documents && data.recent_documents.length > 0 ? (
                data.recent_documents.map(doc => (
                  <div key={doc.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.filename}>{doc.filename}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.file_size_mb.toFixed(2)} MB • {doc.pages} Pages • {doc.questions_asked} Queries</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDate(doc.upload_timestamp)}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', margin: 0 }}>No documents uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MessageSquare size={18} style={{ color: 'var(--success-color)' }} />
              Recent Chats
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.recent_conversations && data.recent_conversations.length > 0 ? (
                data.recent_conversations.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => navigate('/')}
                    style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    className="table-row-hover"
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '0.5rem' }}>
                      {chat.title || 'Untitled Chat'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDate(chat.updated_at)}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', margin: 0 }}>No conversations logged yet.</p>
              )}
            </div>
          </div>

          {/* Recent Search Queries */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Search size={18} style={{ color: 'var(--warning-color)' }} />
                Recent Searches
              </h3>
              <button 
                onClick={() => navigate('/history')} 
                style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <span>See All</span>
                <ChevronRight size={12} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.recent_searches && data.recent_searches.length > 0 ? (
                data.recent_searches.map(search => (
                  <div key={search.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>"{search.query}"</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span style={{ maxWidth: '65%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Document: {search.document_name || 'Global search'}</span>
                      <span>{formatTime(search.timestamp)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', margin: 0 }}>No searches recorded yet.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
