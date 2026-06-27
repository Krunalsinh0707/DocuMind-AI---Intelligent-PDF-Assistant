import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, ChevronDown, User as UserIcon, History, BarChart3, Settings } from 'lucide-react';

interface UserMenuProps {
  onOpenDocuments?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenDocuments }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email ? user.email[0].toUpperCase() : '?';
  return (
    <div className="user-menu-container" ref={menuRef}>
      <button 
        className="user-menu-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          backgroundColor: 'var(--hover-bg)', 
          border: '1px solid var(--border-color)', 
          padding: '0.4rem 0.75rem', 
          borderRadius: '9999px',
          transition: 'all 0.2s'
        }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} referrerPolicy="no-referrer" />
        ) : (
          <div className="user-avatar fallback" style={{ width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.7rem' }}>{initials}</div>
        )}
        <span className="user-name-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.displayName || 'Account'}</span>
        <ChevronDown size={14} className={`chevron-icon ${isOpen ? 'open' : ''}`} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {isOpen && (
        <div 
          className="user-dropdown"
          style={{ 
            minWidth: '240px', 
            background: 'var(--card-bg)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '1rem', 
            padding: '0.75rem', 
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.5rem)',
            zIndex: 500
          }}
        >
          <div className="dropdown-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem 0.75rem 0.5rem' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--accent-color)', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar fallback" style={{ width: '36px', height: '36px', borderRadius: '50%', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName || 'DocuMind User'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </span>
            </div>
          </div>
          <div className="dropdown-divider" style={{ margin: '0.25rem 0 0.5rem 0', height: '1px', background: 'var(--border-color)' }} />
          
          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/profile'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.375rem' }}>
            <UserIcon size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>My Profile</span>
          </button>
          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.375rem' }}>
            <BarChart3 size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Dashboard</span>
          </button>
          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/history'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.375rem' }}>
            <History size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Search History</span>
          </button>
          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/documents'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.375rem' }}>
            <FileText size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>My Documents</span>
          </button>
          <button className="dropdown-item" onClick={() => { setIsOpen(false); alert("Account settings are managed via your profile page."); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.375rem' }}>
            <Settings size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Settings</span>
          </button>
          
          <div className="dropdown-divider" style={{ margin: '0.5rem 0', height: '1px', background: 'var(--border-color)' }} />
          
          <button className="dropdown-item logout" onClick={() => { setIsOpen(false); signOut(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', cursor: 'pointer', textAlign: 'left', borderRadius: '0.5rem' }}>
            <LogOut size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
