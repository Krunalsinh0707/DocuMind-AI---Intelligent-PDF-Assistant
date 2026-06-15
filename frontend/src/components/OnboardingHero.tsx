import React from 'react';
import { Sparkles, FileText, Send, ArrowRight } from 'lucide-react';

interface OnboardingHeroProps {
  onTriggerUpload: () => void;
}

export const OnboardingHero: React.FC<OnboardingHeroProps> = ({ onTriggerUpload }) => {
  return (
    <div className="onboarding-hero-container">
      <div className="hero-logo-box">
        <Sparkles size={40} className="hero-logo-sparkle" />
      </div>
      <h1 className="hero-title">DocuMind AI</h1>
      <p className="hero-subtitle">Your Personal AI Research Assistant</p>
      
      <div className="hero-steps">
        <div className="hero-step">
          <div className="step-icon-wrapper">
            <FileText size={18} />
          </div>
          <span className="step-text">Upload PDFs</span>
        </div>
        <div className="step-arrow">
          <ArrowRight size={14} />
        </div>
        <div className="hero-step">
          <div className="step-icon-wrapper">
            <Send size={18} />
          </div>
          <span className="step-text">Ask Questions</span>
        </div>
        <div className="step-arrow">
          <ArrowRight size={14} />
        </div>
        <div className="hero-step">
          <div className="step-icon-wrapper text-indigo-400">
            <Sparkles size={18} />
          </div>
          <span className="step-text">Get Instant Answers</span>
        </div>
      </div>

      <div className="hero-cta-box">
        <button className="hero-upload-btn btn-primary btn" onClick={onTriggerUpload}>
          Get Started: Upload PDF
        </button>
        <span className="hero-footnote">Supports documents up to 100MB</span>
      </div>
    </div>
  );
};
