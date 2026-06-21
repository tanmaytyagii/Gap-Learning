import React, { useState, useEffect, useRef } from 'react';
import { diagnoseResponse, getAdaptiveQuestion, chatWithTutor } from '../services/ai';
import type { Question, ChatMessage } from '../services/ai';
import { CheckCircle2, AlertCircle, HelpCircle, Loader2, Sparkles, ArrowRight, CornerDownRight, MessageSquare, Send, X } from 'lucide-react';

interface StudentAssessmentProps {
  apiKey: string;
  selectedConceptId: string;
  onAssessmentCompleted: (conceptId: string, isCorrect: boolean, misconceptionId: string, nextConcept: string, xpEarned: number) => void;
  onBackToMap: () => void;
}

export const StudentAssessment: React.FC<StudentAssessmentProps> = ({
  apiKey,
  selectedConceptId,
  onAssessmentCompleted,
  onBackToMap
}) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [workingText, setWorkingText] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Chatbot states
  const [showTutorChat, setShowTutorChat] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  
  // Gamification floating XP text state
  const [floatingXp, setFloatingXp] = useState<{ x: number; y: number; show: boolean } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNextQuestion();
  }, [selectedConceptId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const loadNextQuestion = async () => {
    setIsSubmitting(true);
    setDiagnosticResult(null);
    setSelectedOption('');
    setWorkingText('');
    setShowHint(false);
    setShowTutorChat(false);
    setChatHistory([]);

    try {
      const q = await getAdaptiveQuestion(selectedConceptId, answeredQuestionIds, apiKey);
      setQuestion(q);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    if (!question || !selectedOption) return;

    setIsSubmitting(true);
    try {
      const result = await diagnoseResponse(
        question,
        workingText,
        selectedOption,
        apiKey
      );

      setDiagnosticResult(result);
      setAnsweredQuestionIds(prev => [...prev, question.id]);

      // If correct, trigger a floating XP animation
      if (result.isCorrect) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setFloatingXp({
          x: rect.left + rect.width / 2,
          y: rect.top - 20,
          show: true
        });
        setTimeout(() => setFloatingXp(null), 1200);
      }
    } catch (err) {
      console.error('Error diagnosing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceed = () => {
    if (!diagnosticResult || !question) return;

    const xp = diagnosticResult.isCorrect ? 100 : 20; // 100 XP for correct, 20 XP for attempt/fail
    onAssessmentCompleted(
      question.concept,
      diagnosticResult.isCorrect,
      diagnosticResult.misconceptionId,
      diagnosticResult.suggestedNextConcept,
      xp
    );
  };

  const handleStartTutorChat = () => {
    if (!question || !diagnosticResult) return;
    
    setShowTutorChat(true);
    setChatHistory([
      {
        sender: 'tutor',
        text: `Hi! I noticed a small mistake in your work. You selected "${selectedOption}" but the correct answer is "${question.correctAnswer}". Let's work it out together! What was the first step you took when solving this?`
      }
    ]);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !question || !diagnosticResult) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'student', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const reply = await chatWithTutor(
        question,
        diagnosticResult.misconceptionId,
        [...chatHistory, { sender: 'student', text: userMsg }],
        userMsg,
        apiKey
      );

      setChatHistory(prev => [...prev, { sender: 'tutor', text: reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\$[^\$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <code 
            key={index} 
            style={{ 
              fontFamily: 'var(--font-display)', 
              color: 'var(--primary-light)', 
              fontWeight: '600',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (isSubmitting && !question) {
    return (
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', minHeight: '350px' }}>
        <Loader2 className="pulse-glow-primary" size={48} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>Generating adaptive question using Gemini AI...</p>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Floating XP Animation */}
      {floatingXp?.show && (
        <span 
          className="xp-float-anim" 
          style={{ 
            left: `${floatingXp.x}px`, 
            top: `${floatingXp.y}px` 
          }}
        >
          +100 XP
        </span>
      )}

      {/* Quiz Header */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Active Assessment</span>
          <h2 style={{ fontSize: '1.2rem' }}>Concept: {selectedConceptId.replace('frac_', 'Fraction ').replace('sci_', 'Physics: ').replace('eng_', 'English: ').toUpperCase()}</h2>
        </div>
        <button className="btn btn-secondary" onClick={onBackToMap} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          Quit & View Map
        </button>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Question Panel */}
        <div className="glass" style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6 }}>
            {formatText(question.question)}
          </h3>
        </div>

        {!diagnosticResult ? (
          <>
            {/* Options List */}
            {question.options && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {question.options.map((option, idx) => (
                  <label
                    key={idx}
                    className={`glass ${selectedOption === option ? 'glow-primary' : ''}`}
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      backgroundColor: selectedOption === option ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option}
                      checked={selectedOption === option}
                      onChange={() => setSelectedOption(option)}
                      style={{
                        accentColor: 'var(--primary)',
                        width: '16px',
                        height: '16px'
                      }}
                    />
                    <span>{formatText(option)}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Step-by-Step Explanation Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--primary-light)' }} />
                  Show your work: How did you solve this? (Recommended)
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowHint(!showHint)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-light)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <HelpCircle size={14} /> {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              </div>

              {showHint && (
                <div className="glass" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)', marginBottom: '0.5rem' }}>
                  <strong>Hint:</strong> {question.hint}
                </div>
              )}

              <textarea
                value={workingText}
                onChange={(e) => setWorkingText(e.target.value)}
                placeholder="Explain your steps, e.g.: 'I found a common denominator of 6, then scaled the numerators: 3/6 + 2/6 = 5/6'"
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className={`btn ${!selectedOption || isSubmitting ? 'btn-disabled' : 'btn-primary'}`}
                disabled={!selectedOption || isSubmitting}
                onClick={handleSubmit}
                style={{ minWidth: '160px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Diagnosing...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Diagnostic Feedback State */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header Result Alert */}
            {diagnosticResult.isCorrect ? (
              <div className="glass glow-success" style={{ 
                padding: '1.25rem', 
                backgroundColor: 'rgba(16, 185, 129, 0.04)',
                borderLeft: '4px solid var(--success)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                <div>
                  <h3 style={{ color: 'var(--success-light)', fontSize: '1rem', fontWeight: 600 }}>Correct Answer! (+100 XP)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Great job! You answered correctly and demonstrated solid reasoning.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass glow-warning" style={{ 
                padding: '1.25rem', 
                backgroundColor: 'rgba(245, 158, 11, 0.04)',
                borderLeft: '4px solid var(--warning)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <AlertCircle size={24} style={{ color: 'var(--warning)' }} />
                <div>
                  <h3 style={{ color: 'var(--warning-light)', fontSize: '1rem', fontWeight: 600 }}>
                    Incorrect Answer ({diagnosticResult.misconceptionId !== 'unknown' ? 'Concept Gap Identified' : 'Calculation Error'})
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Don't worry, mistakes are the best way to learn! Let's analyze why this happened.
                  </p>
                </div>
              </div>
            )}

            {/* Diagnostic Remediation Details */}
            <div className="glass" style={{ padding: '1.25rem', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={16} style={{ color: 'var(--primary-light)' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Diagnostic Feedback</h4>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {formatText(diagnosticResult.explanation)}
              </p>
            </div>

            {/* Solution Steps Toggle */}
            <details className="glass" style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}>
              <summary style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CornerDownRight size={14} /> View Step-by-Step Correct Solution
              </summary>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.6', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
                {formatText(question.solutionSteps)}
              </p>
            </details>

            {/* Action Buttons: chat or go back */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.5rem' }}>
              {!diagnosticResult.isCorrect ? (
                <button className="btn btn-secondary" onClick={handleStartTutorChat}>
                  <MessageSquare size={16} style={{ color: 'var(--primary-light)' }} />
                  Solve with Socratic Tutor
                </button>
              ) : <div></div>}
              
              <button className="btn btn-primary" onClick={handleProceed}>
                {diagnosticResult.isCorrect ? 'Proceed (+100 XP)' : 'Back to Concept Map (+20 XP)'}
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Socratic Chat Drawer Overlay */}
      {showTutorChat && (
        <div className="chat-drawer">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--primary-light)' }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Socratic AI Tutor</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Guiding your steps</p>
              </div>
            </div>
            <button 
              onClick={() => setShowTutorChat(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`chat-bubble ${msg.sender === 'student' ? 'chat-bubble-student' : 'chat-bubble-tutor'}`}
              >
                {formatText(msg.text)}
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-bubble chat-bubble-tutor" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                Tutor is typing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Explain your thinking here..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
              disabled={isChatLoading}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSendChatMessage} 
              style={{ padding: '0.75rem', borderRadius: '10px' }}
              disabled={isChatLoading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
