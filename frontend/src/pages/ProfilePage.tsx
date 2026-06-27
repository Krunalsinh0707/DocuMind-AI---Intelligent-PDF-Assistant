import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeMode } from '../context/ThemeContext';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { 
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  HelpCircle, 
  HardDrive, 
  Calendar, 
  ShieldAlert,
  Edit3,
  Save,
  X,
  History,
  Activity,
  User,
  Mail,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProfileStats {
  id: string;
  name: string;
  email: string;
  profile_picture: string | null;
  role: string;
  created_at: string | null;
  last_login: string | null;
  auth_provider: string;
  doc_count: number;
  session_count: number;
  question_count: number;
  storage_used_mb: number;
  total_searches: number;
  average_daily_usage: number;
  latest_uploads: Array<{ id: string; filename: string; upload_timestamp: string; file_size_mb: number; pages: number }>;
  latest_searches: Array<{ id: string; query: string; timestamp: string; document_name: string | null }>;
  latest_chats: Array<{ id: string; title: string; updated_at: string }>;
  recent_login: Array<{ activity_type: string; timestamp: string; description: string }>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit Profile Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPicUrl, setEditPicUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  async function fetchProfileStats() {
    try {
      const data = await api.getProfile();
      setStats(data);
      setEditName(data.name || '');
      setEditEmail(data.email || '');
      setEditPicUrl(data.profile_picture || '');
    } catch (err: any) {
      console.error("Failed to load profile metrics:", err);
      setError("Could not retrieve statistics from backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    try {
      await api.updateProfile(editName, editEmail, editPicUrl);
      setIsEditing(false);
      // Refresh user metrics
      await fetchProfileStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update profile details.");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatOnlyDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fullscreen-loading" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="spinner-container">
          <div className="spinner-ring" style={{ borderTopColor: 'var(--primary-color)' }}></div>
          <p className="loading-text" style={{ color: 'var(--text-secondary)' }}>Loading profile stats...</p>
        </div>
      </div>
    );
  }

  const initials = stats?.name
    ? stats.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : stats?.email ? stats.email[0].toUpperCase() : '?';

  return (
    <div className="page-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10, paddingBottom: '3rem' }}>
        {/* Header Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button 
            onClick={() => navigate('/')}
            className="kb-pill-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Chat</span>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeSwitcher />
            <button 
              onClick={() => navigate('/dashboard')}
              className="kb-pill-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
            >
              <span>Analytics Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="login-error-box" style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <p className="login-error-text" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* Main User Card */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            
            {!isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {stats?.profile_picture ? (
                    <img 
                      src={stats.profile_picture} 
                      alt={stats.name || 'User Avatar'} 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--accent-color)', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="user-avatar fallback"
                      style={{ width: '80px', height: '80px', borderRadius: '50%', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--hover-bg)', color: 'var(--primary-color)', fontWeight: 600 }}
                    >
                      {initials}
                    </div>
                  )}
                  <div>
                    <h1 className="login-app-title" style={{ fontSize: '1.8rem', textAlign: 'left', margin: 0, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {stats?.name || 'DocuMind User'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0.5rem 0' }}>{stats?.email}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="kb-pill-btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'default', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        Role: {stats?.role || 'user'}
                      </span>
                      <span className="kb-pill-btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'default', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        Provider: {stats?.auth_provider || 'Google'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsEditing(true)}
                  className="kb-pill-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={18} style={{ color: 'var(--primary-color)' }} />
                  Edit Account Information
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Full Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <User size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.2rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
                      <input 
                        type="email" 
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                        style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.2rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Profile Picture URL</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Camera size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
                    <input 
                      type="url" 
                      value={editPicUrl}
                      onChange={(e) => setEditPicUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.2rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="kb-pill-btn" 
                    style={{ border: '1px solid var(--border-color)', background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                  <button 
                    type="submit" 
                    className="kb-pill-btn" 
                    disabled={updating}
                    style={{ background: 'var(--primary-gradient)', border: 'none', color: '#FFFFFF' }}
                  >
                    <Save size={14} />
                    <span>{updating ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="login-divider" style={{ margin: 0 }}></div>

            {/* Segmented Theme Switcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Layers size={16} style={{ color: 'var(--accent-color)' }} />
                Appearance Settings
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Customize the visual appearance of DocuMind AI.
              </p>
              <div style={{ display: 'flex', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.25rem', maxWidth: '320px', marginTop: '0.25rem' }}>
                {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                      background: theme === t ? 'var(--card-bg)' : 'transparent',
                      color: theme === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: theme === t ? '0 1px 3px var(--shadow-color)' : 'none'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="login-divider" style={{ margin: 0 }}></div>

            {/* Quick Metrics Grid */}
            <div className="stat-card-grid">
              
              {/* Storage Space */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <HardDrive size={32} style={{ color: 'var(--primary-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Storage Space Used</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.storage_used_mb || 0} MB</span>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <FileText size={32} style={{ color: 'var(--danger-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Documents Index Limit</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.doc_count || 0} Files</span>
                </div>
              </div>

              {/* Total Chats */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <MessageSquare size={32} style={{ color: 'var(--success-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Conversations Logs</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.session_count || 0} Chats</span>
                </div>
              </div>

              {/* Total Searches / Queries */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <History size={32} style={{ color: 'var(--warning-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total Search Inquiries</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.total_searches || 0} Queries</span>
                </div>
              </div>

              {/* Questions count */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <HelpCircle size={32} style={{ color: 'var(--danger-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total LLM Questions</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.question_count || 0} Asked</span>
                </div>
              </div>

              {/* Average Daily Usage */}
              <div className="premium-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', display: 'flex' }}>
                <Activity size={32} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Average Daily Queries</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.average_daily_usage || 0} / Day</span>
                </div>
              </div>

            </div>

            <div className="login-divider" style={{ margin: 0 }}></div>

            {/* Account Meta Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--primary-color)' }} />
                <span>Member Since: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(stats?.created_at || null)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: 'var(--primary-color)' }} />
                <span>Last Login Session: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(stats?.last_login || null)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.03)', padding: '1rem', borderRadius: '8px' }}>
              <ShieldAlert size={20} style={{ color: 'var(--danger-color)' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--danger-color)', display: 'block' }}>Strict Data Isolation Active</span>
                All uploaded documents, parsed vectors, and chat history are isolated to your account. No other users can access your data.
              </div>
            </div>

          </div>

          {/* Activity Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Recent Uploads */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--danger-color)' }} />
                Recent Uploaded Files
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.latest_uploads && stats.latest_uploads.length > 0 ? (
                  stats.latest_uploads.map(doc => (
                    <div key={doc.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} title={doc.filename}>{doc.filename}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.file_size_mb} MB • {doc.pages} Pages</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatOnlyDate(doc.upload_timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No documents uploaded yet.</p>
                )}
              </div>
            </div>

            {/* Recent Search Queries */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} style={{ color: 'var(--warning-color)' }} />
                Recent Search Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.latest_searches && stats.latest_searches.length > 0 ? (
                  stats.latest_searches.map(search => (
                    <div key={search.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>"{search.query}"</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <span>Source: {search.document_name || 'Global Search'}</span>
                        <span>{formatOnlyDate(search.timestamp)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No search queries recorded yet.</p>
                )}
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} style={{ color: 'var(--success-color)' }} />
                Recent Active Chats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.latest_chats && stats.latest_chats.length > 0 ? (
                  stats.latest_chats.map(chat => (
                    <div key={chat.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '0.5rem' }}>{chat.title || 'Untitled Chat'}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatOnlyDate(chat.updated_at)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No chats logged yet.</p>
                )}
              </div>
            </div>

            {/* Login & Security Audits */}
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} style={{ color: 'var(--primary-color)' }} />
                Security & Activity Log
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.recent_login && stats.recent_login.length > 0 ? (
                  stats.recent_login.map((log, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', color: log.activity_type === 'login' ? 'var(--primary-color)' : 'var(--accent-color)' }}>{log.activity_type}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatDate(log.timestamp)}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.description}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No security events logged.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
