import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, X, Sparkles, Folder, Menu, Pin, Edit2, Check, Search, Home, Settings, LogOut, BarChart3, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface ChatSession {
  id: string;
  title: string;
  messages?: any[];
  createdAt?: number;
  is_pinned?: boolean;
  updated_at?: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string, isPinned: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  documentsCount: number;
  onOpenDocuments: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  isSidebarOpen,
  setIsSidebarOpen,
  documentsCount,
  onOpenDocuments
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const pathname = location.pathname;

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : '?';

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleTogglePin = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    onPinSession(session.id, !session.is_pinned);
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session =>
    (session.title || 'Untitled Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter(s => s.is_pinned);
  const recentSessions = filteredSessions.filter(s => !s.is_pinned);

  const renderSessionItem = (session: ChatSession) => {
    const isActive = activeSessionId === session.id;
    const isEditing = editingSessionId === session.id;

    if (isEditing) {
      return (
        <form 
          key={session.id} 
          onSubmit={(e) => handleSaveRename(session.id, e)}
          className="session-item-edit-form"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.5rem', width: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="text" 
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="session-rename-input"
            autoFocus
            style={{ 
              flex: 1, 
              background: 'var(--card-bg)', 
              border: '1px solid var(--primary-color)', 
              borderRadius: '4px', 
              color: 'var(--text-primary)', 
              fontSize: '0.8rem', 
              padding: '0.2rem 0.4rem',
              outline: 'none'
            }}
            onBlur={(e) => handleSaveRename(session.id, e)}
          />
          <button 
            type="submit" 
            className="action-confirm-btn"
            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex' }}
          >
            <Check size={14} />
          </button>
        </form>
      );
    }

    return (
      <div 
        key={session.id} 
        className={`session-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelectSession(session.id)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <MessageSquare size={14} className="session-icon" />
          <span className="session-title" title={session.title}>
            {session.title || 'Untitled Chat'}
          </span>
        </div>
        
        <div className="session-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <button 
            className={`session-pin-btn ${session.is_pinned ? 'pinned' : ''}`}
            onClick={(e) => handleTogglePin(session, e)}
            title={session.is_pinned ? 'Unpin chat' : 'Pin chat'}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: session.is_pinned ? '#fbbf24' : 'rgba(148, 163, 184, 0.4)', 
              cursor: 'pointer', 
              padding: '0.2rem',
              borderRadius: '4px'
            }}
          >
            <Pin size={11} style={{ transform: session.is_pinned ? 'none' : 'rotate(45deg)' }} />
          </button>
          <button 
            className="session-edit-btn"
            onClick={(e) => handleStartRename(session, e)}
            title="Rename conversation"
            style={{ background: 'transparent', border: 'none', color: 'rgba(148, 163, 184, 0.4)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <Edit2 size={11} />
          </button>
          <button 
            className="session-delete-btn"
            onClick={(e) => onDeleteSession(session.id, e)}
            title="Delete conversation"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {!isSidebarOpen && (
        <button 
          className="sidebar-mobile-toggle"
          onClick={() => setIsSidebarOpen(true)}
          title="Open Sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div className="brand-logo mini">
              <Sparkles size={16} className="logo-sparkle" />
            </div>
            <span className="sidebar-title">DocuMind AI</span>
          </div>
          <button 
            className="sidebar-close-btn" 
            onClick={() => setIsSidebarOpen(false)}
            title="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Premium Navigation section */}
        <div className="sidebar-nav-section">
          <button 
            className={`sidebar-nav-item ${pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <MessageSquare size={14} className="sidebar-nav-item-icon" />
            <span>Workspace Chat</span>
          </button>
          <button 
            className={`sidebar-nav-item ${pathname === '/documents' ? 'active' : ''}`}
            onClick={() => navigate('/documents')}
          >
            <Folder size={14} className="sidebar-nav-item-icon" />
            <span>My Documents ({documentsCount})</span>
          </button>
          <button 
            className={`sidebar-nav-item ${pathname === '/history' ? 'active' : ''}`}
            onClick={() => navigate('/history')}
          >
            <History size={14} className="sidebar-nav-item-icon" />
            <span>Search History</span>
          </button>
          <button 
            className={`sidebar-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <BarChart3 size={14} className="sidebar-nav-item-icon" />
            <span>Analytics Dashboard</span>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="sidebar-action-container" style={{ padding: '0.5rem 1.25rem 0.75rem 1.25rem' }}>
          <button className="new-chat-btn" onClick={onNewSession} style={{ background: 'var(--primary-gradient)', border: 'none', color: '#FFFFFF' }}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="sidebar-search-box" style={{ padding: '0 1.25rem 0.5rem 1.25rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', color: 'var(--text-secondary)', opacity: 0.6 }} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                padding: '0.45rem 0.6rem 0.45rem 1.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="sidebar-sessions-list" style={{ flex: 1, overflowY: 'auto' }}>
          {/* Pinned Chats Section */}
          {pinnedSessions.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div className="sessions-section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Pin size={10} style={{ transform: 'rotate(45deg)' }} />
                <span>Pinned</span>
              </div>
              {pinnedSessions.map(renderSessionItem)}
            </div>
          )}

          {/* Recent Chats Section */}
          <div>
            {pinnedSessions.length > 0 && <div className="sessions-section-label">Recents</div>}
            {pinnedSessions.length === 0 && <div className="sessions-section-label">Chat History</div>}
            
            {recentSessions.length === 0 && pinnedSessions.length === 0 ? (
              <div className="sessions-empty">
                <MessageSquare size={24} className="empty-sessions-icon" />
                <p>No matches found</p>
              </div>
            ) : (
              recentSessions.map(renderSessionItem)
            )}
          </div>
        </div>

        {/* Bottom User Profile Panel */}
        {user && (
          <div className="sidebar-user-panel">
            <div className="sidebar-user-info" onClick={() => navigate('/profile')} title="View Profile">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="user-avatar" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--accent-color)', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="user-avatar fallback" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {initials}
                </div>
              )}
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{user.displayName || 'DocuMind User'}</span>
                <span className="sidebar-user-email">{user.email}</span>
              </div>
            </div>
            <div className="sidebar-user-actions">
              <button 
                className="sidebar-user-action-btn" 
                onClick={() => navigate('/profile')} 
                title="Settings"
              >
                <Settings size={14} />
              </button>
              <button 
                className="sidebar-user-action-btn logout" 
                onClick={signOut} 
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
