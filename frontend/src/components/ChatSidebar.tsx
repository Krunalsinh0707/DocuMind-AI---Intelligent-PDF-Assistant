import React from 'react';
import { MessageSquare, Plus, Trash2, X, Sparkles, Folder, Menu } from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
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
  isSidebarOpen,
  setIsSidebarOpen,
  documentsCount,
  onOpenDocuments
}) => {
  return (
    <>
      {/* Mobile toggle button when sidebar is closed */}
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
          <div className="sidebar-brand">
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

        {/* New Chat Button */}
        <div className="sidebar-action-container">
          <button className="new-chat-btn" onClick={onNewSession}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="sidebar-sessions-list">
          <div className="sessions-section-label">Chat History</div>
          {sessions.length === 0 ? (
            <div className="sessions-empty">
              <MessageSquare size={24} className="empty-sessions-icon" />
              <p>No past conversations</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare size={14} className="session-icon" />
                <span className="session-title" title={session.title}>
                  {session.title || 'Untitled Chat'}
                </span>
                <button 
                  className="session-delete-btn"
                  onClick={(e) => onDeleteSession(session.id, e)}
                  title="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div className="sidebar-footer">
          <button className="sidebar-footer-btn" onClick={onOpenDocuments}>
            <Folder size={14} />
            <span>Knowledge Base ({documentsCount})</span>
          </button>
        </div>
      </aside>
    </>
  );
};
