import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Sidebar as SidebarIcon,
  Search,
  BookOpen
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// Import default styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFViewerSidebarProps {
  url: string;
  filename: string;
  onClose: () => void;
  targetPage: number | null;
  onTargetPageHandled: () => void;
}

export const PDFViewerSidebar: React.FC<PDFViewerSidebarProps> = ({
  url,
  filename,
  onClose,
  targetPage,
  onTargetPageHandled
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<any>(null);

  // Sync targetPage when it changes
  useEffect(() => {
    if (targetPage && numPages) {
      const page = Math.min(Math.max(1, targetPage), numPages);
      setPageNumber(page);
      onTargetPageHandled();
    }
  }, [targetPage, numPages, onTargetPageHandled]);

  const onDocumentLoadSuccess = (pdf: any) => {
    pdfDocumentRef.current = pdf;
    setNumPages(pdf.numPages);
    setLoading(false);
    
    // Reset search when new document loads
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setSearchQuery('');
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setLoading(false);
  };

  const changePage = (offset: number) => {
    if (!numPages) return;
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!numPages || isNaN(val)) return;
    if (val >= 1 && val <= numPages) {
      setPageNumber(val);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(2.5, prev + 0.2));
  const handleZoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));
  const handleZoomFit = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40; // subtract padding
      // Standard PDF page width is ~612pt. Fit page width to container.
      const fitScale = containerWidth / 612;
      setScale(Math.min(1.5, Math.max(0.5, fitScale)));
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Simple PDF client-side text search simulation (searching page by page)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !pdfDocumentRef.current) return;

    setLoading(true);
    const query = searchQuery.toLowerCase();
    const matches: number[] = [];

    try {
      for (let i = 1; i <= pdfDocumentRef.current.numPages; i++) {
        const page = await pdfDocumentRef.current.getPage(i);
        const textContent = await page.getTextContent();
        const textStr = textContent.items.map((item: any) => item.str).join(' ').toLowerCase();
        
        if (textStr.includes(query)) {
          matches.push(i);
        }
      }
      
      setSearchResults(matches);
      if (matches.length > 0) {
        setPageNumber(matches[0]);
        setCurrentSearchIndex(0);
      } else {
        setCurrentSearchIndex(-1);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    let nextIdx = currentSearchIndex;
    if (direction === 'next') {
      nextIdx = (currentSearchIndex + 1) % searchResults.length;
    } else {
      nextIdx = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(nextIdx);
    setPageNumber(searchResults[nextIdx]);
  };

  return (
    <div ref={containerRef} className={`pdf-viewer-sidebar-panel ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Top Toolbar */}
      <div className="pdf-viewer-toolbar">
        <div className="pdf-toolbar-section left">
          <button 
            type="button"
            className={`pdf-btn ${isThumbnailsOpen ? 'active' : ''}`}
            onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
            title="Toggle Thumbnails"
          >
            <SidebarIcon size={16} />
          </button>
          <span className="pdf-filename" title={filename}>{filename}</span>
        </div>

        <div className="pdf-toolbar-section center">
          <button 
            type="button" 
            className="pdf-btn" 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="pdf-page-indicator">
            <input 
              type="number" 
              className="pdf-page-input"
              value={pageNumber} 
              onChange={handlePageInputChange}
              min={1}
              max={numPages || 1}
            />
            <span className="pdf-page-total">/ {numPages || '--'}</span>
          </div>
          <button 
            type="button" 
            className="pdf-btn" 
            onClick={() => changePage(1)} 
            disabled={!!numPages && pageNumber >= numPages}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-section right">
          <div className="pdf-zoom-controls">
            <button type="button" className="pdf-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <span className="pdf-zoom-level">{Math.round(scale * 100)}%</span>
            <button type="button" className="pdf-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button type="button" className="pdf-btn" onClick={handleZoomFit} title="Fit to width">
              <BookOpen size={16} />
            </button>
          </div>

          <button type="button" className="pdf-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button type="button" className="pdf-btn close-btn" onClick={onClose} title="Close PDF Viewer">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <form onSubmit={handleSearch} className="pdf-viewer-search-bar">
        <div className="search-input-container">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search document text..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <span className="search-results-count">
              {currentSearchIndex + 1} of {searchResults.length}
            </span>
          )}
        </div>
        <button type="submit" className="search-submit-btn" disabled={!searchQuery.trim()}>Search</button>
        {searchResults.length > 0 && (
          <div className="search-nav-buttons">
            <button type="button" className="pdf-btn compact" onClick={() => navigateSearch('prev')}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="pdf-btn compact" onClick={() => navigateSearch('next')}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </form>

      {/* Main Workspace Body */}
      <div className="pdf-viewer-body">
        {/* Thumbnails Sidebar */}
        {isThumbnailsOpen && numPages && (
          <div className="pdf-thumbnails-panel">
            {Array.from(new Array(numPages), (_, index) => (
              <div 
                key={index} 
                className={`pdf-thumbnail-item ${pageNumber === index + 1 ? 'active' : ''}`}
                onClick={() => setPageNumber(index + 1)}
              >
                <div className="thumbnail-wrapper">
                  <Document file={url} loading={<div className="thumb-loading">...</div>}>
                    <Page pageNumber={index + 1} width={80} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
                <span className="thumbnail-page-num">{index + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main PDF Scrollable Container */}
        <div className="pdf-viewer-canvas-scroller">
          {loading && (
            <div className="pdf-loading-indicator">
              <div className="spinner"></div>
              <span>Loading Document...</span>
            </div>
          )}
          <Document 
            file={url} 
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            <div className="pdf-page-container">
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
};
