import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  HelpCircle, 
  HardDrive, 
  Calendar, 
  ShieldAlert,
  Bot
} from 'lucide-react';

interface ProfileStats {
  name: string;
  email: string;
  profile_picture: string | null;
  role: string;
  created_at: string | null;
  doc_count: number;
  session_count: number;
  question_count: number;
  storage_used_mb: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileStats() {
      try {
        const data = await api.getProfile();
        setStats(data);
      } catch (err: any) {
        console.error("Failed to load profile metrics:", err);
        setError("Could not retrieve statistics from backend.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfileStats();
  }, []);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fullscreen-loading">
        <div className="spinner-container">
          <div className="spinner-ring"></div>
          <p className="loading-text">Loading profile stats...</p>
        </div>
      </div>
    );
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="workspace-container" style={{ padding: '2rem 1.5rem', overflowY: 'auto' }}>
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>

      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Header Action */}
        <button 
          onClick={() => navigate('/')}
          className="kb-pill-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.6rem 1rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Workspace</span>
        </button>

        {/* Profile Card & Info */}
        <div className="login-card" style={{ width: '100%', padding: '2.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User Avatar'} 
                style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #6366f1' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="user-avatar fallback"
                style={{ width: '80px', height: '80px', borderRadius: '50%', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#312e81', color: '#818cf8', fontWeight: 600 }}
              >
                {initials}
              </div>
            )}
            <div>
              <h1 className="login-app-title" style={{ fontSize: '1.8rem', textAlign: 'left', margin: 0 }}>
                {user?.displayName || 'DocuMind User'}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0.2rem 0 0.5rem 0' }}>{user?.email}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="kb-pill-btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'default' }}>
                  Role: {stats?.role || 'user'}
                </span>
              </div>
            </div>
          </div>

          <div className="login-divider" style={{ margin: 0 }}></div>

          {error && (
            <div className="login-error-box" style={{ margin: 0 }}>
              <p className="login-error-text">{error}</p>
            </div>
          )}

          {/* Metrics Dashboard Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            
            {/* Storage Metric */}
            <div className="login-feature-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '0.75rem', display: 'flex' }}>
              <HardDrive className="feature-icon" style={{ color: '#818cf8', width: '24px', height: '24px', marginRight: 0 }} />
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.25rem' }}>Storage Used</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{stats?.storage_used_mb || 0} MB</span>
              </div>
            </div>

            {/* Documents Metric */}
            <div className="login-feature-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '0.75rem', display: 'flex' }}>
              <FileText className="feature-icon" style={{ color: '#f43f5e', width: '24px', height: '24px', marginRight: 0 }} />
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.25rem' }}>Documents Uploaded</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{stats?.doc_count || 0} PDFs</span>
              </div>
            </div>

            {/* Chat sessions Metric */}
            <div className="login-feature-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '0.75rem', display: 'flex' }}>
              <MessageSquare className="feature-icon" style={{ color: '#10b981', width: '24px', height: '24px', marginRight: 0 }} />
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.25rem' }}>Total Chats</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{stats?.session_count || 0} Sessions</span>
              </div>
            </div>

            {/* Questions Asked Metric */}
            <div className="login-feature-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', gap: '0.75rem', display: 'flex' }}>
              <HelpCircle className="feature-icon" style={{ color: '#fbbf24', width: '24px', height: '24px', marginRight: 0 }} />
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginBottom: '0.25rem' }}>Questions Asked</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{stats?.question_count || 0} Queries</span>
              </div>
            </div>

          </div>

          <div className="login-divider" style={{ margin: 0 }}></div>

          {/* Account metadata info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} className="text-indigo-400" />
              <span>Account Created: <strong>{formatDate(stats?.created_at || null)}</strong></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.03)', padding: '1rem', borderRadius: '8px' }}>
              <ShieldAlert size={20} style={{ color: '#ef4444' }} />
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#ef4444', display: 'block' }}>Strict Data Isolation Active</span>
                All uploaded documents, parsed vectors, and chat history are isolated to your account. No other users can access your data.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
