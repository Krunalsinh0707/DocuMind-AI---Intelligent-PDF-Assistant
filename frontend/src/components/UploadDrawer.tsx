import React, { useRef, useState } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isUploading: boolean;
  uploadProgress: number;
  processingMessage: string;
  uploadStatus: { type: 'success' | 'error' | null; message: string };
  onUpload: (files: FileList) => Promise<void>;
  setUploadStatus: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error' | null; message: string }>>;
}

export const UploadDrawer: React.FC<UploadDrawerProps> = ({
  isOpen,
  onClose,
  isUploading,
  uploadProgress,
  processingMessage,
  uploadStatus,
  onUpload,
  setUploadStatus
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(e.target.files);
    }
  };

  return (
    <div className="upload-drawer-overlay">
      <div className="upload-drawer-container">
        <div className="drawer-header">
          <div className="drawer-title-box">
            <UploadCloud size={20} className="text-indigo-400" />
            <h3>Import Documents</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose} disabled={isUploading}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status banner */}
          {uploadStatus.message && (
            <div className={`status-banner ${uploadStatus.type}`} style={{ margin: '0 0 1rem 0' }}>
              {uploadStatus.type === 'success' ? (
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
              )}
              <span className="status-text">{uploadStatus.message}</span>
              <button 
                type="button"
                className="status-close" 
                onClick={() => setUploadStatus({ type: null, message: '' })}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div 
            className={`drawer-dropzone ${isDragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <UploadCloud size={44} className="upload-icon text-indigo-500" />
            <h4>Drag & drop files or click to upload</h4>
            <p className="dropzone-info">Supports PDF files up to 100MB (Max 5 files at a time)</p>
            
            <input 
              type="file" 
              ref={fileInputRef}
              multiple 
              accept=".pdf" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            {isUploading && (
              <div className="drawer-progress-section">
                <div className="progress-text-row">
                  <span className="progress-msg">{processingMessage}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar progress-bar-shimmer" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
