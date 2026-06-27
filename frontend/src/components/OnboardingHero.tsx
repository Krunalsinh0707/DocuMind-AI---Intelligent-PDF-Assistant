import React, { useRef, useState } from 'react';
import { Sparkles, FileText, Send, ArrowRight, CloudUpload, CheckCircle, Loader2 } from 'lucide-react';

interface OnboardingHeroProps {
  onTriggerUpload: () => void;
  onUpload: (files: FileList) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  processingMessage: string;
  uploadStatus: { type: 'success' | 'error' | null; message: string };
}

export const OnboardingHero: React.FC<OnboardingHeroProps> = ({
  onTriggerUpload,
  onUpload,
  isUploading,
  uploadProgress,
  processingMessage,
  uploadStatus
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(e.target.files);
    }
  };

  const getDropzoneContent = () => {
    if (isUploading) {
      return (
        <div className="onboarding-upload-progress">
          <div className="upload-progress-spinner">
            <Loader2 size={36} className="spin" style={{ color: 'var(--primary-color)' }} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {processingMessage || 'Processing...'}
          </h3>
          <div className="onboarding-progress-bar-wrapper">
            <div className="progress-bar-container" style={{ height: '6px', borderRadius: '999px' }}>
              <div
                className="progress-bar progress-bar-shimmer"
                style={{ width: `${uploadProgress}%`, borderRadius: '999px' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {uploadProgress}% complete
            </span>
          </div>
        </div>
      );
    }

    if (uploadStatus.type === 'success') {
      return (
        <div className="onboarding-upload-success">
          <CheckCircle size={44} style={{ color: 'var(--success-color)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            ✨ Your document is ready.
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Ask me anything about it.
          </p>
        </div>
      );
    }

    return (
      <>
        <CloudUpload
          size={48}
          className={`onboarding-drop-zone-icon ${isDragActive ? 'drag-active-icon' : ''}`}
        />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {isDragActive ? 'Release to upload' : 'Upload your first PDF document'}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto' }}>
          {isDragActive
            ? 'Drop your PDF files here to begin processing'
            : 'Drag and drop your PDF here, or click to browse. Supports files up to 100MB.'}
        </p>
        {!isDragActive && (
          <button
            className="btn btn-primary"
            style={{ marginTop: '0.5rem' }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse Files
          </button>
        )}
      </>
    );
  };

  return (
    <div className="onboarding-hero-container" style={{ maxWidth: '640px', padding: '4rem 1.5rem' }}>
      <div className="hero-logo-box" style={{ width: '72px', height: '72px', borderRadius: '1.5rem', margin: '0 auto 1.5rem auto' }}>
        <Sparkles size={38} className="hero-logo-sparkle" />
      </div>
      <h1 className="hero-title" style={{ fontSize: '2.25rem', marginBottom: '0.75rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.2' }}>
        👋 Welcome to DocuMind AI
      </h1>
      <p className="hero-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
        Upload a PDF and turn it into a searchable knowledge base.
      </p>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.5' }}>
        Ask questions, generate notes, create summaries, and learn faster.
      </p>

      {/* Main Upload Dropzone with native drag-and-drop */}
      <div
        className={`onboarding-drop-zone ${isDragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && !isDragActive && fileInputRef.current?.click()}
        style={{ marginBottom: '3rem' }}
      >
        {getDropzoneContent()}

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {/* Error status */}
        {uploadStatus.type === 'error' && (
          <div className="status-banner error" style={{ marginTop: '0.75rem', width: '100%' }}>
            <span className="status-text">{uploadStatus.message}</span>
          </div>
        )}
      </div>

      <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
          How it works
        </h4>
        <div className="hero-steps" style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr 20px 1fr', alignItems: 'center', gap: '0.5rem' }}>
          <div className="hero-step">
            <div className="step-icon-wrapper" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8' }}>
              <FileText size={20} />
            </div>
            <span className="step-text" style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>1. Drop PDFs</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Drag & drop — upload starts instantly</span>
          </div>
          <div className="step-arrow" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
            <ArrowRight size={16} />
          </div>
          <div className="hero-step">
            <div className="step-icon-wrapper" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: '#a78bfa' }}>
              <Send size={20} />
            </div>
            <span className="step-text" style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>2. Ask Questions</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Chat with documents using natural language</span>
          </div>
          <div className="step-arrow" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
            <ArrowRight size={16} />
          </div>
          <div className="hero-step">
            <div className="step-icon-wrapper" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)', color: '#f472b6' }}>
              <Sparkles size={20} />
            </div>
            <span className="step-text" style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>3. Get Insights</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Receive cited semantic answers instantly</span>
          </div>
        </div>
      </div>
    </div>
  );
};
