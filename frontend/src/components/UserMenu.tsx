import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, ChevronDown, User as UserIcon } from 'lucide-react';

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
      <button className="user-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" referrerPolicy="no-referrer" />
        ) : (
          <div className="user-avatar fallback">{initials}</div>
        )}
        <span className="user-name-label">{user.displayName || 'Account'}</span>
        <ChevronDown size={14} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <p className="dropdown-name">{user.displayName || 'DocuMind User'}</p>
            <p className="dropdown-email">{user.email}</p>
          </div>
          <div className="dropdown-divider" />
          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/profile'); }}>
            <UserIcon size={16} />
            <span>Profile & Dashboard</span>
          </button>
          {onOpenDocuments && (
            <button className="dropdown-item" onClick={() => { setIsOpen(false); onOpenDocuments(); }}>
              <FileText size={16} />
              <span>My Documents</span>
            </button>
          )}
          <button className="dropdown-item logout" onClick={() => { setIsOpen(false); signOut(); }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
