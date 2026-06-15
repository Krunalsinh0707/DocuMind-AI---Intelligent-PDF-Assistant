import React from 'react';
import { Sparkles, FileText, HelpCircle, BookOpen, Lightbulb, Clipboard } from 'lucide-react';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const prompts = [
  {
    text: "Summarize this document",
    desc: "Get a concise overview of key points",
    icon: <FileText size={16} className="prompt-icon text-indigo-400" />
  },
  {
    text: "What are the key insights?",
    desc: "Discover core takeaways and conclusions",
    icon: <Lightbulb size={16} className="prompt-icon text-amber-400" />
  },
  {
    text: "Create study notes",
    desc: "Generate structured study aids",
    icon: <BookOpen size={16} className="prompt-icon text-emerald-400" />
  },
  {
    text: "Generate interview questions",
    desc: "Prepare questions based on document content",
    icon: <HelpCircle size={16} className="prompt-icon text-purple-400" />
  },
  {
    text: "Extract important topics",
    desc: "List and explain main subject matters",
    icon: <Sparkles size={16} className="prompt-icon text-pink-400" />
  },
  {
    text: "Extract facts & figures",
    desc: "Pull out statistics and key assertions",
    icon: <Clipboard size={16} className="prompt-icon text-blue-400" />
  }
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onSelectPrompt }) => {
  return (
    <div className="suggested-prompts-container">
      <div className="prompts-grid">
        {prompts.map((p, idx) => (
          <button 
            key={idx} 
            className="prompt-card"
            onClick={() => onSelectPrompt(p.text)}
          >
            <div className="prompt-card-header">
              {p.icon}
              <span className="prompt-card-title">{p.text}</span>
            </div>
            <p className="prompt-card-desc">{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
