import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, HelpCircle, Loader2, Sparkles, ArrowRight,
  ArrowLeft, MessageSquare, Send, X, BarChart3, Trophy, ChevronRight,
} from 'lucide-react';
import { diagnoseResponse, getAdaptiveQuestion, chatWithTutor, CONCEPTS } from '../../services/ai';
import type { Question, ChatMessage, DiagnosticResult } from '../../services/ai';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Timer } from '../ui/Timer';
import { ProgressBar } from '../ui/ProgressRing';

interface StudentAssessmentProps {
  apiKey: string;
  selectedConceptId: string;
  onAssessmentCompleted: (conceptId: string, isCorrect: boolean, misconceptionId: string, nextConcept: string, xpEarned: number) => void;
  onBackToMap: () => void;
}

const TOTAL_QUESTIONS = 5;
const TIMER_SECONDS = 600;

const difficultyConfig = {
  easy: { label: 'Easy', color: 'success', width: 33 },
  medium: { label: 'Medium', color: 'warning', width: 66 },
  hard: { label: 'Hard', color: 'danger', width: 100 },
};

function formatText(text: string) {
  if (!text) return '';
  const parts = text.split(/(\$[^\$]+\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return (
        <code key={index} className="font-[family-name:var(--font-display)] text-primary-light font-semibold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function getConceptName(conceptId: string): string {
  for (const subj of Object.values(CONCEPTS)) {
    if (subj[conceptId]) return subj[conceptId].name;
  }
  return conceptId;
}

export function StudentAssessment({
  apiKey,
  selectedConceptId,
  onAssessmentCompleted,
  onBackToMap,
}: StudentAssessmentProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [workingText, setWorkingText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number; xp: number }>({ correct: 0, total: 0, xp: 0 });
  const [showTutorChat, setShowTutorChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [floatingXp, setFloatingXp] = useState<{ x: number; y: number } | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNextQuestion();
    setQuestionIndex(0);
    setResults({ correct: 0, total: 0, xp: 0 });
    setShowSummary(false);
    setTimerRunning(true);
  }, [selectedConceptId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const result = await diagnoseResponse(question, workingText, selectedOption, apiKey);
      setDiagnosticResult(result);
      setAnsweredQuestionIds((prev) => [...prev, question.id]);

      const xp = result.isCorrect ? 100 : 20;
      setResults((prev) => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        total: prev.total + 1,
        xp: prev.xp + xp,
      }));

      if (result.isCorrect) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setFloatingXp({ x: rect.left + rect.width / 2, y: rect.top - 20 });
        setTimeout(() => setFloatingXp(null), 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceed = () => {
    if (!diagnosticResult || !question) return;

    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
      setShowSummary(true);
      setTimerRunning(false);
      return;
    }

    setQuestionIndex((i) => i + 1);
    loadNextQuestion();
  };

  const handleFinish = () => {
    if (!diagnosticResult || !question) return;
    const xp = diagnosticResult.isCorrect ? 100 : 20;
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
    setChatHistory([{
      sender: 'tutor',
      text: `Hi! I noticed a small mistake in your work. You selected "${selectedOption}" but the correct answer is "${question.correctAnswer}". Let's work it out together! What was the first step you took when solving this?`,
    }]);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !question || !diagnosticResult) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { sender: 'student', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const reply = await chatWithTutor(question, diagnosticResult.misconceptionId, [...chatHistory, { sender: 'student', text: userMsg }], userMsg, apiKey);
      setChatHistory((prev) => [...prev, { sender: 'tutor', text: reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isSubmitting && !question) {
    return (
      <Card className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin-slow mb-4" />
        <p className="text-text-secondary">Generating adaptive question...</p>
        <div className="mt-6 w-64 space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
          <div className="skeleton h-3 w-3/5 rounded" />
        </div>
      </Card>
    );
  }

  if (!question) return null;

  if (showSummary) {
    const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card glow="primary" className="max-w-2xl mx-auto">
          <CardBody className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] mb-2">Assessment Complete!</h2>
            <p className="text-text-secondary mb-8">Here's how you performed on {getConceptName(selectedConceptId)}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="glass-card rounded-xl p-4">
                <p className="text-3xl font-bold text-success">{accuracy}%</p>
                <p className="text-xs text-text-secondary mt-1">Accuracy</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-3xl font-bold text-primary-light">{results.correct}/{results.total}</p>
                <p className="text-xs text-text-secondary mt-1">Correct</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-3xl font-bold text-warning">{results.xp}</p>
                <p className="text-xs text-text-secondary mt-1">XP Earned</p>
              </div>
            </div>

            <ProgressBar value={accuracy} label="Overall Performance" className="mb-8 max-w-md mx-auto" />

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={onBackToMap} icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Dashboard
              </Button>
              <Button onClick={handleFinish} icon={<ChevronRight className="w-4 h-4" />}>
                Save Progress
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  const diff = difficultyConfig[question.difficulty];
  const progressPct = ((questionIndex + (diagnosticResult ? 1 : 0)) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {floatingXp && (
        <span className="xp-float-anim" style={{ left: floatingXp.x, top: floatingXp.y }}>+100 XP</span>
      )}

      {/* Question Navigation Panel */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <Card>
          <CardHeader className="py-4">
            <h3 className="text-sm font-semibold">Question Navigator</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <ProgressBar value={progressPct} label="Progress" size="sm" />

            <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
                const isCurrent = i === questionIndex;
                const isDone = i < questionIndex || (i === questionIndex && diagnosticResult);
                const isCorrect = i < questionIndex;

                return (
                  <button
                    key={i}
                    className={`flex items-center justify-center lg:justify-start gap-2 p-2 rounded-lg text-sm font-medium transition-colors ${
                      isCurrent ? 'bg-primary/20 border border-primary/40 text-primary-light' :
                      isDone ? (isCorrect ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning') :
                      'bg-white/3 text-text-muted border border-white/6'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-white/5">{i + 1}</span>
                    <span className="hidden lg:inline">Question {i + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/8">
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-3">Adaptive Difficulty</p>
              <div className="space-y-2">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${question.difficulty === level ? 'bg-primary-light ring-2 ring-primary/50' : 'bg-white/20'}`} />
                    <span className={`text-xs capitalize ${question.difficulty === level ? 'text-text font-medium' : 'text-text-muted'}`}>{level}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${diff.width}%` }}
                  className={`h-full rounded-full ${diff.color === 'success' ? 'bg-success' : diff.color === 'warning' ? 'bg-warning' : 'bg-danger'}`}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Quiz Area */}
      <div className="lg:col-span-3 order-1 lg:order-2">
        <Card>
          <CardHeader>
            <div>
              <Badge variant="primary" className="mb-2 normal-case">Active Assessment</Badge>
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">{getConceptName(selectedConceptId)}</h2>
            </div>
            <div className="flex items-center gap-3">
              <Timer initialSeconds={TIMER_SECONDS} running={timerRunning} />
              <Button variant="ghost" size="sm" onClick={onBackToMap}>Exit</Button>
            </div>
          </CardHeader>

          <CardBody className="space-y-6">
            <div className="glass-card rounded-xl p-5 border-l-4 border-primary">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text-secondary">Question {questionIndex + 1} of {TOTAL_QUESTIONS}</span>
                <Badge variant={diff.color as 'success' | 'warning' | 'danger'}>{diff.label}</Badge>
              </div>
              <h3 className="text-base sm:text-lg font-medium leading-relaxed">{formatText(question.question)}</h3>
            </div>

            <AnimatePresence mode="wait">
              {!diagnosticResult ? (
                <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {question.options && (
                    <div className="grid gap-3">
                      {question.options.map((option, idx) => (
                        <label
                          key={idx}
                          className={`glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                            selectedOption === option ? 'border-primary/40 bg-primary/8 shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'hover:border-white/15'
                          }`}
                        >
                          <input
                            type="radio"
                            name="option"
                            value={option}
                            checked={selectedOption === option}
                            onChange={() => setSelectedOption(option)}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-sm">{formatText(option)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary-light" />
                        Show your work (recommended)
                      </span>
                      <button type="button" onClick={() => setShowHint(!showHint)} className="text-xs text-primary-light flex items-center gap-1 hover:underline">
                        <HelpCircle className="w-3.5 h-3.5" /> {showHint ? 'Hide Hint' : 'Show Hint'}
                      </button>
                    </div>

                    {showHint && (
                      <div className="glass-card rounded-lg p-3 text-sm text-blue-300 border border-blue-500/20 bg-blue-500/5">
                        <strong>Hint:</strong> {question.hint}
                      </div>
                    )}

                    <textarea
                      value={workingText}
                      onChange={(e) => setWorkingText(e.target.value)}
                      placeholder="Explain your reasoning step by step..."
                      rows={3}
                      className="w-full bg-black/25 border border-white/10 rounded-xl text-text p-4 text-sm outline-none focus:border-primary/50 resize-y transition-colors"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button disabled={!selectedOption || isSubmitting} loading={isSubmitting} onClick={handleSubmit} icon={<ArrowRight className="w-4 h-4" />}>
                      Submit Answer
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className={`glass-card rounded-xl p-5 border-l-4 flex gap-4 ${diagnosticResult.isCorrect ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
                    {diagnosticResult.isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-warning shrink-0" />
                    )}
                    <div>
                      <h3 className={`font-semibold ${diagnosticResult.isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {diagnosticResult.isCorrect ? 'Correct! (+100 XP)' : 'Gap Identified — Let\'s Learn'}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {diagnosticResult.isCorrect ? 'Excellent reasoning demonstrated.' : 'Mistakes are the best way to learn. Review the feedback below.'}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-primary-light" />
                      <h4 className="text-sm font-semibold">AI Diagnostic Feedback</h4>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{formatText(diagnosticResult.explanation)}</p>
                  </div>

                  <details className="glass-card rounded-xl p-4 cursor-pointer">
                    <summary className="text-sm font-medium text-text-secondary">View Step-by-Step Solution</summary>
                    <p className="text-sm text-text-secondary mt-3 pl-4 border-l-2 border-white/10 whitespace-pre-wrap">{formatText(question.solutionSteps)}</p>
                  </details>

                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    {!diagnosticResult.isCorrect && (
                      <Button variant="secondary" onClick={handleStartTutorChat} icon={<MessageSquare className="w-4 h-4" />}>
                        Socratic Tutor
                      </Button>
                    )}
                    <Button onClick={handleProceed} className="sm:ml-auto" icon={<ArrowRight className="w-4 h-4" />}>
                      {questionIndex + 1 >= TOTAL_QUESTIONS ? 'View Summary' : 'Next Question'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </Card>
      </div>

      {/* Socratic Chat Drawer */}
      <AnimatePresence>
        {showTutorChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-light" />
                <div>
                  <h3 className="font-semibold text-sm">Socratic AI Tutor</h3>
                  <p className="text-xs text-text-secondary">Guiding your steps</p>
                </div>
              </div>
              <button onClick={() => setShowTutorChat(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'student'
                    ? 'ml-auto bg-primary text-white rounded-tr-sm'
                    : 'bg-primary/10 border border-primary/15 rounded-tl-sm'
                }`}>
                  {formatText(msg.text)}
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin-slow" /> Tutor is typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2 bg-black/20">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Explain your thinking..."
                disabled={isChatLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
              <Button onClick={handleSendChatMessage} disabled={isChatLoading} className="px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
