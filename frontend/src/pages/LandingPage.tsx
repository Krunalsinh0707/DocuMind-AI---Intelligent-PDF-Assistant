import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { 
  Sparkles, 
  ShieldCheck, 
  Database, 
  Zap, 
  BookOpen, 
  FileText, 
  ArrowRight, 
  Check, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Microscope, 
  Briefcase, 
  Code, 
  Search, 
  MessageSquare, 
  Files, 
  FileUp, 
  Star,
  Quote,
  TrendingUp,
  Cpu,
  FolderLock
} from 'lucide-react';

// Counter component that increments to a target value when visible
function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let start = 0;
    const end = target;
    const totalFrames = Math.min(Math.floor(duration / 16), 120);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out quad
      const currentCount = Math.round(end * (progress * (2 - progress)));
      
      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(counter);
      } else {
        setCount(currentCount);
      }
    }, 16);

    return () => clearInterval(counter);
  }, [hasStarted, target, duration]);

  return (
    <div ref={elementRef} className="counter-number">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function LandingPage() {
  const { user, signInWithGoogle, signInMock } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Typewriter Live Preview State
  const [previewStep, setPreviewStep] = useState(0);
  const [previewText, setPreviewText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const previewIntervalRef = useRef<any>(null);

  // Testimonials Carousel State
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isCarouselPlaying, setIsCarouselPlaying] = useState(true);

  // Use state for demo select action
  const [selectedDemoTab, setSelectedDemoTab] = useState<'finance' | 'academic' | 'tech'>('finance');

  const testimonials = [
    {
      quote: "DocuMind AI completely changed how I write literature reviews. What used to take days of scanning and searching PDFs now takes seconds. The citations are incredibly reliable.",
      author: "Sarah Jenkins",
      role: "PhD Candidate in Neuroscience",
      avatar: "🎓",
      rating: 5,
      tag: "Researchers"
    },
    {
      quote: "Uploading our 200-page compliance manuals and querying them with natural language saves our engineering team hours. The workspace isolation makes it secure.",
      author: "David Chen",
      role: "Lead Platform Engineer",
      avatar: "👨‍💻",
      rating: 5,
      tag: "Developers"
    },
    {
      quote: "I can upload multiple quarterly reports, ask for cross-comparisons of net operating margins, and get structured tables instantly. This is a game-changer for due diligence.",
      author: "Elena Rostova",
      role: "M&A Associate",
      avatar: "💼",
      rating: 5,
      tag: "Professionals"
    },
    {
      quote: "Exam preparation is so much faster now. I upload my textbooks, generate summaries, and ask DocuMind to test my knowledge. My grades have improved significantly.",
      author: "Liam Kowalski",
      role: "Medical Student",
      avatar: "🧑‍🎓",
      rating: 5,
      tag: "Students"
    }
  ];

  // Mouse follow effect for the Hero element
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  // Live product typewriter script simulation
  const demoScenarios = {
    finance: {
      fileName: "Q3_Financials_Report.pdf",
      userQuery: "Summarize this quarterly report and find the year-over-year revenue growth.",
      aiResponse: "Based on the Q3 Financial Report:\n\n• **Summary**: Net revenue reached $14.2M, driven primarily by enterprise SaaS expansion (+24% YoY) and professional services.\n• **YoY Revenue Growth**: Total revenue increased by **18.4%** compared to Q3 of the prior fiscal year.\n• **Operating Margins**: Expanded by 120bps to 22.8% due to optimized support workflows."
    },
    academic: {
      fileName: "Attention_Is_All_You_Need.pdf",
      userQuery: "What is the key advantage of Self-Attention over recurrent layers mentioned in this paper?",
      aiResponse: "According to the paper, the primary advantages of Self-Attention are:\n\n1. **Computational Complexity**: Total complexity per layer is lower when the sequence length is shorter than the representation dimensionality.\n2. **Parallelization**: Sequential operations are reduced to O(1), allowing massive parallelization compared to RNNs (O(n)).\n3. **Maximum Path Length**: The path length between any two distant positions is O(1), making it significantly easier to learn long-range dependencies."
    },
    tech: {
      fileName: "Kubernetes_Best_Practices.pdf",
      userQuery: "How should we configure resource limits for production microservices?",
      aiResponse: "Based on the Kubernetes guidelines in the document:\n\n• **Liveness & Readiness Probes**: Define both for all services. Avoid relying on simple TCP checks; use endpoint-specific HTTP endpoints.\n• **Resource Requests**: Set requests equal to historical median usage to maximize scheduling efficiency.\n• **CPU Limits**: Leave limits undefined or set highly generous constraints to avoid throttle bottlenecks during start-up cycles.\n• **Memory Limits**: Must be set equal to requests to avoid out-of-memory container terminations (OOMKilled)."
    }
  };

  // Handle live preview typewriter simulation
  useEffect(() => {
    if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    
    const scenario = demoScenarios[selectedDemoTab];
    setPreviewStep(0);
    setPreviewText('');
    setIsTyping(true);

    let currentText = '';
    let charIndex = 0;
    const targetQuery = scenario.userQuery;

    // Type the user query first
    const queryInterval = setInterval(() => {
      if (charIndex < targetQuery.length) {
        currentText += targetQuery.charAt(charIndex);
        setPreviewText(currentText);
        charIndex++;
      } else {
        clearInterval(queryInterval);
        setIsTyping(false);
        setPreviewStep(1); // switch to AI "thinking"

        // Pause on thinking, then type AI response
        setTimeout(() => {
          setPreviewStep(2); // AI answering
          setIsTyping(true);
          let aiText = '';
          let aiCharIndex = 0;
          const targetResponse = scenario.aiResponse;

          const responseInterval = setInterval(() => {
            if (aiCharIndex < targetResponse.length) {
              aiText += targetResponse.charAt(aiCharIndex);
              setPreviewText(aiText);
              aiCharIndex++;
            } else {
              clearInterval(responseInterval);
              setIsTyping(false);
              setPreviewStep(3); // completed
            }
          }, 12);
          previewIntervalRef.current = responseInterval;
        }, 1200);
      }
    }, 25);

    previewIntervalRef.current = queryInterval;

    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, [selectedDemoTab]);

  // Testimonial Carousel auto play
  useEffect(() => {
    if (!isCarouselPlaying) return;

    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isCarouselPlaying]);

  // Handle sign in wrapper
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      navigate('/app');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check Firebase configs.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleMockSignIn = () => {
    signInMock('dev_user_admin_dashboard_99');
    navigate('/app');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-layout">
      {/* Top Premium Navbar */}
      <header className="landing-navbar">
        <div className="navbar-inner">
          <div className="navbar-logo" onClick={() => scrollToSection('hero')}>
            <div className="navbar-logo-icon">
              <Sparkles size={20} className="logo-sparkle" />
            </div>
            <span className="navbar-brand">DocuMind AI</span>
          </div>
          
          <nav className="navbar-links">
            <button onClick={() => scrollToSection('features')} className="nav-link-btn">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link-btn">How it Works</button>
            <button onClick={() => scrollToSection('why-us')} className="nav-link-btn">Why Us</button>
            <button onClick={() => scrollToSection('testimonials')} className="nav-link-btn">Reviews</button>
          </nav>

          <div className="navbar-actions">
            <ThemeSwitcher />
            {user ? (
              <button onClick={() => navigate('/app')} className="btn-navbar-primary">
                <span>Go to Workspace</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={handleMockSignIn} className="btn-navbar-secondary">
                  Demo Sandbox
                </button>
                <button onClick={() => scrollToSection('cta')} className="btn-navbar-primary">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1 — HERO SECTION */}
      <section 
        id="hero" 
        ref={heroRef} 
        onMouseMove={handleMouseMove} 
        className="hero-section"
      >
        {/* Animated ambient mesh bg */}
        <div className="hero-radial-glow"></div>
        <div 
          className="hero-mouse-glow"
          style={{
            transform: `translate(${mousePosition.x - 350}px, ${mousePosition.y - 350}px)`,
          }}
        ></div>

        <div className="hero-grid-pattern"></div>
        <div className="hero-ambient-orb orb-1"></div>
        <div className="hero-ambient-orb orb-2"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-tag">New</span>
            <span className="badge-text">Powered by Claude 3.5 & GPT-4o</span>
            <Sparkles size={12} className="badge-icon-sparkle" />
          </div>

          <h1 className="hero-title">
            Turn Any PDF Into an <br />
            <span className="hero-title-highlight">Intelligent AI Assistant</span>
          </h1>

          <p className="hero-description">
            Upload documents, research papers, reports, books, and notes.
            Ask questions instantly and get AI-powered answers backed by your content.
          </p>

          <div className="hero-buttons">
            {user ? (
              <button onClick={() => navigate('/app')} className="btn-hero-primary">
                Go to Workspace <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </button>
            ) : (
              <>
                <button onClick={() => scrollToSection('cta')} className="btn-hero-primary">
                  Get Started Free <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </button>
                <button onClick={() => scrollToSection('preview')} className="btn-hero-secondary">
                  Watch Demo <Play size={16} fill="currentColor" style={{ marginLeft: '0.5rem' }} />
                </button>
              </>
            )}
          </div>

          {/* Floating UI elements surrounding the hero */}
          <div className="floating-ui-container">
            <div className="floating-card pdf-card">
              <div className="card-icon-wrapper red">
                <FileText size={20} />
              </div>
              <div className="card-content-wrapper">
                <span className="card-filename">Q3_Report.pdf</span>
                <span className="card-status">Vectorized</span>
              </div>
            </div>

            <div className="floating-card ai-node-card">
              <div className="card-icon-wrapper purple">
                <Sparkles size={20} />
              </div>
              <div className="card-content-wrapper">
                <span className="card-filename">Semantic Model</span>
                <span className="card-status">Ready</span>
              </div>
            </div>

            <div className="floating-card query-node-card">
              <div className="card-icon-wrapper green">
                <Zap size={20} />
              </div>
              <div className="card-content-wrapper">
                <span className="card-filename">Response latency</span>
                <span className="card-status">1.4s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — TRUST / STATISTICS SECTION */}
      <section className="stats-section">
        <div className="stats-container">
          <p className="stats-header-text">Trusted by Students, Researchers, Developers, and Professionals</p>
          <div className="stats-grid">
            <div className="stat-card">
              <AnimatedCounter target={10000} suffix="+" />
              <div className="stat-label">Documents Analyzed</div>
            </div>
            <div className="stat-card">
              <AnimatedCounter target={50000} suffix="+" />
              <div className="stat-label">Questions Answered</div>
            </div>
            <div className="stat-card">
              <AnimatedCounter target={99} suffix="%" />
              <div className="stat-label">Search Accuracy</div>
            </div>
            <div className="stat-card">
              <AnimatedCounter target={2} suffix=" sec" duration={1000} />
              <div className="stat-label">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW IT WORKS */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Four simple steps to transform raw documents into contextual intelligence</p>
          </div>

          <div className="process-grid">
            <div className="process-card">
              <div className="process-step-num">01</div>
              <div className="process-icon-box blue">
                <FileUp size={24} />
              </div>
              <h3 className="process-title">Upload</h3>
              <p className="process-desc">Drag and drop PDFs up to 100MB into secure, private workspaces.</p>
            </div>

            <div className="process-card">
              <div className="process-step-num">02</div>
              <div className="process-icon-box purple">
                <Cpu size={24} />
              </div>
              <h3 className="process-title">Process</h3>
              <p className="process-desc">Our pipeline extracts headers, tables, texts, and figures with absolute precision.</p>
            </div>

            <div className="process-card">
              <div className="process-step-num">03</div>
              <div className="process-icon-box green">
                <Search size={24} />
              </div>
              <h3 className="process-title">Search</h3>
              <p className="process-desc">Deep vector embeddings store relationships for lightning-fast semantic retrieval.</p>
            </div>

            <div className="process-card">
              <div className="process-step-num">04</div>
              <div className="process-icon-box gold">
                <MessageSquare size={24} />
              </div>
              <h3 className="process-title">Chat</h3>
              <p className="process-desc">Ask questions naturally, compare multiple PDFs, and obtain sources instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FEATURE SHOWCASE */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Feature Showcase</h2>
            <p className="section-subtitle">Everything you need to master your research and reports</p>
          </div>

          <div className="features-grid">
            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-blue">
                <MessageSquare size={20} />
              </div>
              <h3 className="feature-card-title">AI-Powered PDF Chat</h3>
              <p className="feature-card-desc">Ask questions in natural language and receive answers backed by direct quotes and page citations.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-purple">
                <Search size={20} />
              </div>
              <h3 className="feature-card-title">Semantic Search</h3>
              <p className="feature-card-desc">Search documents using conceptual phrases. Finds matches based on contextual meaning, not just exact keywords.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-green">
                <Files size={20} />
              </div>
              <h3 className="feature-card-title">Multi-Document Analysis</h3>
              <p className="feature-card-desc">Group files into specific project workspaces to extract cross-document reports and summaries instantly.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-gold">
                <TrendingUp size={20} />
              </div>
              <h3 className="feature-card-title">Instant Summaries</h3>
              <p className="feature-card-desc">Automatically get key takeaways, methodology outlines, and high-level summaries as soon as you upload.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-red">
                <Microscope size={20} />
              </div>
              <h3 className="feature-card-title">Research Assistant</h3>
              <p className="feature-card-desc">Synthesize difficult scientific papers. Automatically extract references, parameters, and variable findings.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-cyan">
                <BookOpen size={20} />
              </div>
              <h3 className="feature-card-title">Study Notes Generator</h3>
              <p className="feature-card-desc">Convert complex medical, law, or engineering textbooks into beautifully structured study note systems.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-pink">
                <Sparkles size={20} />
              </div>
              <h3 className="feature-card-title">Interview Prep</h3>
              <p className="feature-card-desc">Test your understanding by generating interactive mock questions based strictly on your uploaded files.</p>
            </div>

            <div className="feature-show-card">
              <div className="feature-icon-wrapper icon-teal">
                <Database size={20} />
              </div>
              <h3 className="feature-card-title">Knowledge Base Creation</h3>
              <p className="feature-card-desc">Organize all your scattered PDF collections into unified, isolated research notebooks with zero clutter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — LIVE PRODUCT PREVIEW */}
      <section id="preview" className="preview-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">See It In Action</h2>
            <p className="section-subtitle">Interact with our simulated environment to experience the latency and interface</p>
          </div>

          {/* Interactive Demo Tabs */}
          <div className="demo-tabs">
            <button 
              className={`demo-tab-btn ${selectedDemoTab === 'finance' ? 'active' : ''}`}
              onClick={() => setSelectedDemoTab('finance')}
            >
              📊 Financial Analyst
            </button>
            <button 
              className={`demo-tab-btn ${selectedDemoTab === 'academic' ? 'active' : ''}`}
              onClick={() => setSelectedDemoTab('academic')}
            >
              🎓 Researcher Mode
            </button>
            <button 
              className={`demo-tab-btn ${selectedDemoTab === 'tech' ? 'active' : ''}`}
              onClick={() => setSelectedDemoTab('tech')}
            >
              💻 Tech Doc Search
            </button>
          </div>

          {/* Chat Mockup Window */}
          <div className="preview-mockup-window">
            <div className="mockup-header">
              <div className="mockup-window-controls">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="mockup-title">
                📁 Workspace: {demoScenarios[selectedDemoTab].fileName}
              </div>
              <div style={{ width: '48px' }}></div>
            </div>

            <div className="mockup-body">
              {/* Sidebar */}
              <div className="mockup-sidebar">
                <div className="sidebar-group-title">Active PDFs</div>
                <div className="sidebar-pdf-item active">
                  <FileText size={14} className="pdf-icon" />
                  <span className="pdf-name-text">{demoScenarios[selectedDemoTab].fileName}</span>
                </div>
                <div className="sidebar-pdf-item">
                  <FileText size={14} />
                  <span>References.pdf</span>
                </div>
                <div className="sidebar-pdf-item">
                  <FileText size={14} />
                  <span>Appendix_A.pdf</span>
                </div>

                <div className="sidebar-bottom">
                  <div className="kb-badge">
                    <Database size={12} />
                    <span>Isolated storage</span>
                  </div>
                </div>
              </div>

              {/* Chat View */}
              <div className="mockup-chat-area">
                <div className="chat-history">
                  
                  {/* User message */}
                  <div className="chat-bubble-row user">
                    <div className="user-avatar-placeholder">ME</div>
                    <div className="chat-bubble">
                      {previewStep === 0 && isTyping ? (
                        <>
                          {previewText}
                          <span className="cursor-blink">|</span>
                        </>
                      ) : (
                        demoScenarios[selectedDemoTab].userQuery
                      )}
                    </div>
                  </div>

                  {/* AI message */}
                  {(previewStep >= 1) && (
                    <div className="chat-bubble-row ai">
                      <div className="ai-avatar-placeholder">
                        <Sparkles size={14} />
                      </div>
                      <div className="chat-bubble">
                        {previewStep === 1 ? (
                          <div className="typing-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        ) : (
                          <div className="markdown-demo-content">
                            {previewStep === 2 && isTyping ? (
                              <>
                                {previewText}
                                <span className="cursor-blink">|</span>
                              </>
                            ) : (
                              demoScenarios[selectedDemoTab].aiResponse.split('\n').map((line, idx) => (
                                <p key={idx} style={{ margin: line === '' ? '0.5rem 0' : '0.15rem 0' }}>
                                  {line.startsWith('• ') ? (
                                    <span style={{ display: 'flex', alignItems: 'flex-start' }}>
                                      <span style={{ marginRight: '0.5rem' }}>•</span>
                                      <span>
                                        {line.substring(2).split('**').map((chunk, cIdx) => 
                                          cIdx % 2 === 1 ? <strong key={cIdx}>{chunk}</strong> : chunk
                                        )}
                                      </span>
                                    </span>
                                  ) : line.match(/^\d+\./) ? (
                                    <span style={{ display: 'flex', alignItems: 'flex-start' }}>
                                      <span style={{ marginRight: '0.5rem' }}>{line.split(' ')[0]}</span>
                                      <span>
                                        {line.substring(line.indexOf(' ')).split('**').map((chunk, cIdx) => 
                                          cIdx % 2 === 1 ? <strong key={cIdx}>{chunk}</strong> : chunk
                                        )}
                                      </span>
                                    </span>
                                  ) : (
                                    line.split('**').map((chunk, cIdx) => 
                                      cIdx % 2 === 1 ? <strong key={cIdx}>{chunk}</strong> : chunk
                                    )
                                  )}
                                </p>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Chat Input Bar */}
                <div className="chat-input-bar">
                  <input 
                    type="text" 
                    readOnly 
                    placeholder="Ask documind anything..." 
                    className="chat-input-field" 
                  />
                  <button className="chat-send-btn-mock" disabled>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — USE CASES */}
      <section className="use-cases-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Designed for Your Workflow</h2>
            <p className="section-subtitle">Empowering teams and individuals to learn and analyze instantly</p>
          </div>

          <div className="use-case-grid">
            <div className="use-case-card">
              <div className="use-case-icon">🎓</div>
              <h3 className="use-case-title">Students</h3>
              <p className="use-case-desc">Upload lectures, syllabi, and textbooks. Automatically generate structured notes, chapter summaries, and exam cards.</p>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">📊</div>
              <h3 className="use-case-title">Researchers</h3>
              <p className="use-case-desc">Parse scientific journals, extract statistical constants, cross-compare study methodologies, and cite references accurately.</p>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">💼</div>
              <h3 className="use-case-title">Professionals</h3>
              <p className="use-case-desc">Review market reports, audit contracts, parse earnings transcripts, and output key business trends within minutes.</p>
            </div>

            <div className="use-case-card">
              <div className="use-case-icon">💻</div>
              <h3 className="use-case-title">Developers</h3>
              <p className="use-case-desc">Analyze system specifications, reference manuals, APIs, and code documentations with conversational search queries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — WHY DOCUMIND AI (Comparison) */}
      <section id="why-us" className="comparison-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Why DocuMind AI?</h2>
            <p className="section-subtitle">How we compare to traditional and standard approaches</p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th>Traditional PDF Reader</th>
                  <th className="highlight-col">DocuMind AI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Search capabilities</strong></td>
                  <td className="bad-row">❌ Simple keyword exact matches only</td>
                  <td className="good-row">✅ Advanced semantic context matching</td>
                </tr>
                <tr>
                  <td><strong>Extraction speed</strong></td>
                  <td className="bad-row">❌ Manual reading & highlighting</td>
                  <td className="good-row">✅ AI-powered structural summaries in &lt; 2s</td>
                </tr>
                <tr>
                  <td><strong>Document Limits</strong></td>
                  <td className="bad-row">❌ View one file at a time</td>
                  <td className="good-row">✅ Mult-document workspace querying</td>
                </tr>
                <tr>
                  <td><strong>Study Tools</strong></td>
                  <td className="bad-row">❌ No intelligent tools or prompts</td>
                  <td className="good-row">✅ Custom note & interview generation</td>
                </tr>
                <tr>
                  <td><strong>Data Security</strong></td>
                  <td className="bad-row">❌ Uploaded public directories</td>
                  <td className="good-row">✅ Fully isolated secure container files</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 8 — TESTIMONIALS */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">What Users Are Saying</h2>
            <p className="section-subtitle">Don't take our word for it — join thousands of satisfied researchers and builders</p>
          </div>

          {/* Testimonial Slider */}
          <div 
            className="testimonial-carousel-container"
            onMouseEnter={() => setIsCarouselPlaying(false)}
            onMouseLeave={() => setIsCarouselPlaying(true)}
          >
            <div className="testimonial-slide">
              <div className="quote-badge">
                <Quote size={28} className="quote-icon-decor" />
              </div>
              
              <div className="testimonial-rating">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>

              <p className="testimonial-text">
                "{testimonials[currentTestimonial].quote}"
              </p>

              <div className="testimonial-user-info">
                <span className="user-avatar-tag">{testimonials[currentTestimonial].avatar}</span>
                <div>
                  <h4 className="user-name">{testimonials[currentTestimonial].author}</h4>
                  <p className="user-role">{testimonials[currentTestimonial].role}</p>
                </div>
              </div>

              <span className="user-badge-category">{testimonials[currentTestimonial].tag}</span>
            </div>

            {/* Slider Dots & Action Buttons */}
            <div className="carousel-nav-footer">
              <button 
                onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="carousel-arrow-btn"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="carousel-dots">
                {testimonials.map((_, idx) => (
                  <span 
                    key={idx}
                    className={`carousel-dot ${currentTestimonial === idx ? 'active' : ''}`}
                    onClick={() => setCurrentTestimonial(idx)}
                  ></span>
                ))}
              </div>

              <button 
                onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="carousel-arrow-btn"
              >
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => setIsCarouselPlaying(!isCarouselPlaying)}
                className="carousel-play-pause-btn"
                title={isCarouselPlaying ? "Pause autoplay" : "Start autoplay"}
              >
                {isCarouselPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FINAL CTA */}
      <section id="cta" className="cta-section">
        <div className="cta-grid-decor"></div>
        <div className="cta-glow-decor"></div>

        <div className="cta-content-wrapper">
          <div className="cta-logo-glow">
            <Sparkles size={36} />
          </div>

          <h2 className="cta-title">Start Learning Faster With AI</h2>
          <p className="cta-desc">
            Transform your PDFs into an intelligent knowledge base today. Join thousands of users who have streamlined their reading workflows.
          </p>

          {error && (
            <div className="auth-error-wrapper">
              <p className="auth-error-msg">{error}</p>
            </div>
          )}

          <div className="cta-action-panel">
            {user ? (
              <button onClick={() => navigate('/app')} className="btn-cta-main">
                <span>Go to Workspace</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="auth-buttons-cta">
                <button 
                  onClick={handleGoogleSignIn} 
                  disabled={isSigningIn}
                  className="google-signin-btn-cta"
                >
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isSigningIn ? 'Connecting...' : 'Sign In With Google'}</span>
                </button>

                <div className="auth-separator">
                  <span>or try the sandbox</span>
                </div>

                <button 
                  onClick={handleMockSignIn}
                  className="btn-mock-sandbox-cta"
                >
                  <Cpu size={16} />
                  <span>Launch Instant Sandbox</span>
                </button>
              </div>
            )}
          </div>

          <div className="cta-trust-badges">
            <span className="badge-item">
              <FolderLock size={14} />
              <span>Isolated Environment</span>
            </span>
            <span className="badge-item">
              <ShieldCheck size={14} />
              <span>Private File Storage</span>
            </span>
            <span className="badge-item">
              <Zap size={14} />
              <span>Instant AI Retrieval</span>
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand-section">
            <div className="navbar-logo">
              <div className="navbar-logo-icon">
                <Sparkles size={16} className="logo-sparkle" />
              </div>
              <span className="navbar-brand" style={{ fontSize: '1.15rem' }}>DocuMind AI</span>
            </div>
            <p className="footer-brand-desc">
              Transforming static documents into conversational databases. Secure, fast, and intelligent.
            </p>
            <div className="footer-copyright">
              © {new Date().getFullYear()} DocuMind AI. All rights reserved.
            </div>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4 className="footer-col-title">Product</h4>
              <ul className="footer-col-links">
                <li><button onClick={() => scrollToSection('features')} className="footer-btn-link">Features</button></li>
                <li><span className="footer-status-pill">Pricing (Coming Soon)</span></li>
                <li><a href="#/docs" className="footer-txt-link">Documentation</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Resources</h4>
              <ul className="footer-col-links">
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="footer-txt-link">GitHub Repo</a></li>
                <li><a href="#/privacy" className="footer-txt-link">Privacy Policy</a></li>
                <li><a href="#/terms" className="footer-txt-link">Terms of Service</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Contact</h4>
              <ul className="footer-col-links">
                <li><span className="footer-txt-info">support@documind.ai</span></li>
                <li><span className="footer-txt-info">San Francisco, CA</span></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
