import React, { useState } from 'react';
import { Copy, RotateCcw, User, Bot, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export type Source = {
  page: number | null;
  score: number;
  content: string;
  source_name: string;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp?: number;
};

interface ChatMessageProps {
  message: Message;
  messageIndex: number;
  onCopy: (text: string, index: number) => void;
  onRegenerate?: (index: number) => void;
  copied: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  messageIndex,
  onCopy,
  onRegenerate,
  copied
}) => {
  const [showSnippets, setShowSnippets] = useState(false);
  const isAssistant = message.role === 'assistant';
  
  // Format timestamp
  const timeString = message.timestamp 
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Get unique page numbers
  const uniqueSources = message.sources 
    ? Array.from(new Set(message.sources.map(s => s.page).filter((p): p is number => p !== null)))
    : [];

  return (
    <div className={`chat-message-row ${message.role}`}>
      <div className={`msg-avatar ${message.role}`}>
        {isAssistant ? <Bot size={15} color="#ffffff" /> : <User size={15} color="#94a3b8" />}
      </div>
      <div className="msg-body">
        <div className="msg-header">
          <span className="msg-author-name">
            {isAssistant ? 'DocuMind AI' : 'You'}
          </span>
          <div className="msg-meta">
            <span className="msg-time">
              <Clock size={10} style={{ marginRight: '3px' }} />
              {timeString}
            </span>
            {isAssistant && (
              <div className="msg-actions">
                <button 
                  type="button"
                  className="msg-action-btn"
                  onClick={() => onCopy(message.content, messageIndex)}
                  title="Copy response"
                >
                  <Copy size={12} />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {onRegenerate && (
                  <button 
                    type="button"
                    className="msg-action-btn"
                    onClick={() => onRegenerate(messageIndex)}
                    title="Regenerate response"
                  >
                    <RotateCcw size={12} />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="msg-content">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className="msg-line">{line}</p>
          ))}
        </div>

        {/* Inline retrieved sources list */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="sources-container">
            <div className="sources-header-inline" onClick={() => setShowSnippets(!showSnippets)}>
              <span className="sources-title-label">Sources Used:</span>
              <div className="sources-pills-row">
                {uniqueSources.map((page, idx) => (
                  <span key={idx} className="source-pill">
                    • Page {page}
                  </span>
                ))}
                {uniqueSources.length === 0 && (
                  <span className="source-pill">Document Context</span>
                )}
              </div>
              <button type="button" className="toggle-snippets-btn">
                {showSnippets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Collapsible snippet matches */}
            {showSnippets && (
              <div className="sources-expanded-list">
                {message.sources.map((src, idx) => (
                  <div key={idx} className="inline-source-card">
                    <div className="inline-source-card-header">
                      <div className="inline-source-doc-name">
                        <FileText size={12} className="text-indigo-400" />
                        <span>{src.source_name}</span>
                      </div>
                      <span className="inline-source-meta">
                        Page {src.page || 'N/A'}
                      </span>
                    </div>
                    <p className="inline-source-snippet">
                      "{src.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
