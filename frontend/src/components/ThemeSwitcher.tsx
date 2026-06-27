import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../context/ThemeContext';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';

interface ThemeSwitcherProps {
  align?: 'left' | 'right';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ align = 'right', className = '' }) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={14} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { value: 'system', label: 'System', icon: <Monitor size={14} /> }
  ];

  const getActiveIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={15} className="theme-toggle-icon sun-anim" />;
      case 'dark':
        return <Moon size={15} className="theme-toggle-icon moon-anim" />;
      default:
        return <Monitor size={15} className="theme-toggle-icon system-anim" />;
    }
  };

  const getActiveLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'System';
    }
  };

  return (
    <div className={`theme-switcher-container ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        className={`theme-switcher-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Change theme, current: ${theme}`}
      >
        <span className="trigger-icon">{getActiveIcon()}</span>
        <span className="trigger-label">{getActiveLabel()}</span>
        <ChevronDown size={12} className={`trigger-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className={`theme-switcher-dropdown align-${align}`}>
          <div className="dropdown-title-label">Theme Appearance</div>
          <div className="dropdown-items-list">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`theme-dropdown-item ${theme === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="item-icon-wrapper">{opt.icon}</span>
                <span className="item-label-text">{opt.label}</span>
                {theme === opt.value && (
                  <span className="item-checkmark-wrapper">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
