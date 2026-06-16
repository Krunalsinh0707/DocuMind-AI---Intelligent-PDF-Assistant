import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Database,
  ChevronRight,
  FolderOpen,
  X,
  FileText,
  ExternalLink,
  Trash2,
  Bot
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ChatSidebar } from '../components/ChatSidebar';
import type { ChatSession } from '../components/ChatSidebar';
import { UserMenu } from '../components/UserMenu';
import { SuggestedPrompts } from '../components/SuggestedPrompts';
import { OnboardingHero } from '../components/OnboardingHero';
import { ChatMessage } from '../components/ChatMessage';
import type { Message } from '../components/ChatMessage';
import { UploadDrawer } from '../components/UploadDrawer';

export default function WorkspacePage() {
  const { user } = useAuth();

  // Sidebar / Chat Sessions States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Document states
  const [documents, setDocuments] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [reindexingDocIds, setReindexingDocIds] = useState<string[]>([]);

  // Ingestion Drawer states
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [processingMessage, setProcessingMessage] = useState<string>('');

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Fetch on Mount and User Change
  useEffect(() => {
    fetchDocuments();
    if (user) {
      loadSessions();
    }
  }, [user]);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data || []);
      if (data && data.length > 0) {
        // Set the most recently updated session active
        const active = data[0];
        setActiveSessionId(active.id);
        fetchMessages(active.id);
      } else {
        // Create a default session in the database
        await createNewSession();
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  const fetchMessages = async (sessId: string) => {
    try {
      const data = await api.getSessionMessages(sessId);
      // Map DB message logs to frontend UI Message format
      const formatted = data.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp * 1000,
        sources: m.sources || []
      }));
      setMessages(formatted);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const createNewSession = async () => {
    try {
      const newSess = await api.createChatSession('New Conversation');
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setMessages([]);
    } catch (err) {
      console.error('Error creating new session:', err);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    fetchMessages(id);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(id);
      const filtered = sessions.filter((s) => s.id !== id);
      setSessions(filtered);
      
      if (filtered.length === 0) {
        await createNewSession();
      } else if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
        fetchMessages(filtered[0].id);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Process PDF uploads
  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus({ type: null, message: '' });
    setProcessingMessage('Validating files...');

    const filesArray = Array.from(files);
    
    if (filesArray.length > 5) {
      setUploadStatus({ type: 'error', message: 'Maximum 5 files allowed per upload.' });
      setIsUploading(false);
      return;
    }

    for (const file of filesArray) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadStatus({ type: 'error', message: 'Only PDF files are allowed.' });
        setIsUploading(false);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'File size exceeds limit of 100MB.' });
        setIsUploading(false);
        return;
      }
    }

    try {
      setProcessingMessage('Uploading to secure user storage...');
      
      const results = await api.uploadPdf(files, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.round(percent * 0.5));
        }
      });
      
      const immediateFailures = results.filter((res: any) => res.status === 'failed');
      if (immediateFailures.length > 0) {
        setUploadStatus({
          type: 'error',
          message: `Ingestion failed: ${immediateFailures[0].message || 'Error processing document.'}`
        });
        fetchDocuments();
        setIsUploading(false);
        return;
      }

      const activeJobs = results.filter((res: any) => res.status === 'processing');
      
      if (activeJobs.length > 0) {
        setProcessingMessage('Indexing chunks in background...');
        let allCompleted = false;
        
        while (!allCompleted) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          let totalProgress = 0;
          let completedCount = 0;
          let failedJobMessage = '';
          
          for (const job of activeJobs) {
            try {
              const statusData = await api.getUploadStatus(job.job_id);
              if (statusData.status === 'success') {
                totalProgress += 100;
                completedCount++;
              } else if (statusData.status === 'failed') {
                failedJobMessage = statusData.message || 'Error processing document.';
                completedCount++;
              } else {
                totalProgress += statusData.progress;
              }
            } catch (pollErr) {
              console.error('Error polling status:', pollErr);
            }
          }
          
          const avgProgress = totalProgress / activeJobs.length;
          setUploadProgress(Math.round(50 + avgProgress * 0.5));
          
          if (completedCount === activeJobs.length) {
            allCompleted = true;
            if (failedJobMessage) {
              setUploadStatus({ type: 'error', message: `Ingestion failed: ${failedJobMessage}` });
            } else {
              setUploadStatus({ type: 'success', message: 'Indexed successfully! Document ready for chat.' });
              setTimeout(() => setIsUploadDrawerOpen(false), 2000);
            }
          }
        }
      } else {
        setUploadProgress(100);
        setUploadStatus({ type: 'success', message: 'Indexed successfully! Ready for queries.' });
        setTimeout(() => setIsUploadDrawerOpen(false), 2000);
      }
      fetchDocuments();
    } catch (err: any) {
      setUploadProgress(0);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Unable to process document.';
      setUploadStatus({ type: 'error', message: msg });
    } finally {
      setIsUploading(false);
      setProcessingMessage('');
    }
  };

  // Document Management handlers
  const handleViewDoc = (docId: string) => {
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
    if (!window.confirm(`Remove "${filename}" from your knowledge base?`)) return;
    try {
      await api.deleteDocument(docId);
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm("WARNING: Are you sure you want to clear your personal knowledge base? This action is permanent.")) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetDb();
      setDocuments([]);
      setMessages([]);
      await loadSessions();
    } catch (err) {
      alert('Failed to reset knowledge base.');
    } finally {
      setIsResetting(false);
    }
  };

  // Chat Submission handler
  const handleChatSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const queryText = promptOverride || input.trim();
    if (!queryText || isLoading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: queryText, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Update conversation title locally if it was default
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (activeSession && activeSession.title === 'New Conversation') {
      const truncatedTitle = queryText.length > 25 ? `${queryText.substring(0, 25)}...` : queryText;
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title: truncatedTitle } : s))
      );
    }

    // Prepare history payload
    const history: [string, string][] = [];
    let lastUserMsg = null;
    for (const msg of messages) {
      if (msg.role === 'user') {
        lastUserMsg = msg.content;
      } else if (msg.role === 'assistant' && lastUserMsg) {
        history.push([lastUserMsg, msg.content]);
        lastUserMsg = null;
      }
    }

    try {
      const data = await api.chat(queryText, history, activeSessionId);
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'An error occurred during generative search.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errorMsg}`, timestamp: Date.now() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIdx(index);
    setTimeout(() => setCopiedMessageIdx(null), 2000);
  };

  const handleRegenerate = async (index: number) => {
    let targetQuery = '';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        targetQuery = messages[i].content;
        break;
      }
    }
    if (!targetQuery) return;

    setIsLoading(true);
    const history: [string, string][] = [];
    let lastUserMsg = null;
    for (let i = 0; i < index - 1; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        lastUserMsg = msg.content;
      } else if (msg.role === 'assistant' && lastUserMsg) {
        history.push([lastUserMsg, msg.content]);
        lastUserMsg = null;
      }
    }

    try {
      const data = await api.chat(targetQuery, history, activeSessionId);
      setMessages((prev) => {
        const updated = [...prev];
        updated[index] = {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          timestamp: Date.now()
        };
        return updated;
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to regenerate response.';
      setMessages((prev) => {
        const updated = [...prev];
        updated[index] = {
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          timestamp: Date.now()
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      {/* Chat Sidebar Navigation */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={createNewSession}
        onDeleteSession={handleDeleteSession}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        documentsCount={documents.length}
        onOpenDocuments={() => setIsDocManagerOpen(true)}
      />

      {/* Main Content Area */}
      <div className={`workspace-main-content ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        
        {/* Workspace Top Header */}
        <header className="workspace-header">
          <div className="header-brand-box">
            {!isSidebarOpen && (
              <button 
                type="button"
                className="sidebar-trigger" 
                onClick={() => setIsSidebarOpen(true)}
                title="Open Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <div className="header-brand-title">
              <h2>DocuMind AI</h2>
              <p>AI-Powered Document Intelligence</p>
            </div>
          </div>

          <div className="header-center-info">
            <button 
              type="button"
              className="kb-pill-btn" 
              onClick={() => setIsDocManagerOpen(true)}
              title="Manage Knowledge Base"
            >
              <Database size={13} className="text-indigo-400" />
              <span>{documents.length} PDF{documents.length !== 1 ? 's' : ''}</span>
            </button>
          </div>

          <div className="header-actions">
            {/* Profile Dropdown */}
            <UserMenu onOpenDocuments={() => setIsDocManagerOpen(true)} />
          </div>
        </header>

        {/* Page Body: Onboarding vs Chat Conversation */}
        <div className="workspace-scrollable-body">
          {documents.length === 0 ? (
            <OnboardingHero onTriggerUpload={() => setIsUploadDrawerOpen(true)} />
          ) : (
            <div className="workspace-chat-container">
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="welcome-chat-hero">
                    <Sparkles size={32} className="text-indigo-500 float-animation" />
                    <h2>How can I assist your research today?</h2>
                    <p>Ask queries, synthesize content, or generate insights from your indexed documents.</p>
                  </div>
                  
                  {/* Suggested Quick Action Prompts */}
                  <SuggestedPrompts onSelectPrompt={(p) => handleChatSubmit(undefined, p)} />
                </div>
              ) : (
                <div className="chat-messages-scroller">
                  {messages.map((msg, idx) => (
                    <ChatMessage
                      key={idx}
                      message={msg}
                      messageIndex={idx}
                      onCopy={handleCopyText}
                      onRegenerate={handleRegenerate}
                      copied={copiedMessageIdx === idx}
                    />
                  ))}

                  {/* Loading Typing Indicator */}
                  {isLoading && (
                    <div className="chat-message-row assistant typing">
                      <div className="msg-avatar assistant">
                        <Bot size={15} color="#ffffff" />
                      </div>
                      <div className="msg-body">
                        <span className="msg-author-name">DocuMind AI</span>
                        <div className="typing-indicator-box">
                          <span className="typing-indicator-dot"></span>
                          <span className="typing-indicator-dot"></span>
                          <span className="typing-indicator-dot"></span>
                          <span className="typing-indicator-text">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        {documents.length > 0 && (
          <div className="workspace-input-container">
            <form onSubmit={(e) => handleChatSubmit(e)} className="workspace-form">
              <textarea
                className="prompt-textarea"
                placeholder="Ask anything about your indexed documents..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
                rows={1}
              />
              <button 
                type="submit" 
                className="prompt-submit-btn" 
                disabled={!input.trim() || isLoading}
                title="Send message"
              >
                <Send size={15} />
              </button>
            </form>
            <div className="input-info-footer">
              <span>Secure isolated workspace</span>
              <span>•</span>
              <button 
                type="button" 
                className="footer-upload-link" 
                onClick={() => setIsUploadDrawerOpen(true)}
              >
                Upload PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Upload if documents exist and sidebar collapsed */}
      {documents.length > 0 && !isUploadDrawerOpen && (
        <button 
          className="floating-upload-fab"
          onClick={() => setIsUploadDrawerOpen(true)}
          title="Upload PDF"
        >
          <FileText size={18} />
          <span>Upload PDF</span>
        </button>
      )}

      {/* Slide-over Drawer for Managing Documents */}
      {isDocManagerOpen && (
        <div className="doc-manager-overlay" onClick={() => setIsDocManagerOpen(false)}>
          <div className="doc-manager-container" onClick={(e) => e.stopPropagation()}>
            <div className="doc-manager-header">
              <div className="title-box">
                <FolderOpen size={18} className="text-indigo-400" />
                <h3>Knowledge Base</h3>
              </div>
              <button className="close-btn" onClick={() => setIsDocManagerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="doc-manager-body">
              <div className="manager-actions">
                <button 
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() => {
                    setIsDocManagerOpen(false);
                    setIsUploadDrawerOpen(true);
                  }}
                >
                  <span>Upload PDFs</span>
                </button>
                <button 
                  type="button"
                  className="btn btn-danger btn-compact"
                  onClick={handleResetDb}
                  disabled={isResetting}
                >
                  <RefreshCw size={12} className={isResetting ? 'spin' : ''} />
                  <span>Reset All</span>
                </button>
              </div>

              <div className="doc-list-section">
                <h4>Indexed Documents ({documents.length})</h4>
                {documents.length === 0 ? (
                  <div className="empty-docs-state">
                    <FileText size={32} className="text-slate-600 mb-2" />
                    <p>No documents indexed yet.</p>
                  </div>
                ) : (
                  <div className="doc-manager-list">
                    {documents.map((doc) => {
                      const isReindexing = reindexingDocIds.includes(doc.id);
                      const sizeFormatted = doc.file_size_mb 
                        ? `${doc.file_size_mb.toFixed(2)} MB`
                        : `${(doc.chunk_count * 0.5).toFixed(1)} KB`;
                      return (
                        <div key={doc.id} className="doc-manager-item">
                          <div className="doc-item-details">
                            <FileText size={16} className="text-indigo-400" />
                            <div className="meta">
                              <span className="name" title={doc.filename}>{doc.filename}</span>
                              <span className="size">{sizeFormatted} • {doc.chunk_count || 0} chunks</span>
                            </div>
                          </div>
                          <div className="doc-item-actions">
                            <button 
                              className="action-btn"
                              onClick={() => handleViewDoc(doc.id)}
                              title="Download/View File"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button 
                              className="action-btn"
                              onClick={() => handleReindexDoc(doc.id, doc.filename)}
                              disabled={isReindexing}
                              title="Reindex Document"
                            >
                              <RefreshCw size={14} className={isReindexing ? 'spin' : ''} />
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                              disabled={isReindexing}
                              title="Remove Document"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Upload Drawer */}
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        processingMessage={processingMessage}
        uploadStatus={uploadStatus}
        onUpload={handleUpload}
        setUploadStatus={setUploadStatus}
      />
    </div>
  );
}
