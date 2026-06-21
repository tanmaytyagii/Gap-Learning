import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Settings, CheckCircle, Zap, Trophy,
  ChevronDown, User,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { AnalyticsCards, LearningProgress } from '../components/dashboard/AnalyticsCards';
import { ActivityTimeline, AIRecommendations } from '../components/dashboard/ActivityTimeline';
import { ConceptMap } from '../components/concept-map/ConceptMap';
import { StudentAssessment } from '../components/assessment/StudentAssessment';
import { Badge } from '../components/ui/Badge';
import { getStoredApiKey, setStoredApiKey, SUBJECTS } from '../services/ai';
import type { SubjectId, ConceptStatus } from '../types';

export function StudentPortal() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState('');
  const [activeGap, setActiveGap] = useState('');
  const [xp, setXp] = useState(340);
  const [streak] = useState(5);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState(['Quick Starter 🚀']);
  const [activeSubject, setActiveSubject] = useState<SubjectId>('math');
  const [subjectProgress, setSubjectProgress] = useState<Record<string, Record<string, ConceptStatus>>>({
    math: {
      frac_visual: 'unlocked',
      frac_equiv: 'locked',
      frac_add_like: 'locked',
      frac_add_unlike: 'locked',
      frac_multiply: 'locked',
    },
    science: {
      sci_force: 'unlocked',
      sci_gravity: 'locked',
      sci_net_force: 'locked',
      sci_action_reaction: 'locked',
    },
    english: {
      eng_present: 'unlocked',
      eng_past: 'locked',
      eng_perfect: 'locked',
    },
  });

  useEffect(() => {
    const calcLevel = Math.floor(xp / 500) + 1;
    if (calcLevel > level) {
      setLevel(calcLevel);
      setBadges((prev) => [...prev, `Level ${calcLevel} Champion 🏆`]);
    }
  }, [xp, level]);

  useEffect(() => {
    const key = getStoredApiKey();
    if (key) setApiKey(key);
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setStoredApiKey(val);
  };

  const handleAssessmentCompleted = (
    conceptId: string,
    isCorrect: boolean,
    misconceptionId: string,
    nextConceptId: string,
    xpEarned: number
  ) => {
    setXp((prev) => prev + xpEarned);
    setSubjectProgress((prev) => {
      const currentSubjectMap = { ...prev[activeSubject] };
      if (isCorrect) {
        currentSubjectMap[conceptId] = 'mastered';
        if (nextConceptId && currentSubjectMap[nextConceptId] === 'locked') {
          currentSubjectMap[nextConceptId] = 'unlocked';
        }
        setActiveGap('');
      } else {
        currentSubjectMap[conceptId] = 'gap';
        setActiveGap(misconceptionId);
        if (nextConceptId && currentSubjectMap[nextConceptId] === 'locked') {
          currentSubjectMap[nextConceptId] = 'unlocked';
        }
      }
      return { ...prev, [activeSubject]: currentSubjectMap };
    });
    setSelectedConcept('');
  };

  const handleSubjectChange = (subj: SubjectId) => {
    setActiveSubject(subj);
    setSelectedConcept('');
    setActiveGap('');
  };

  return (
    <div className="min-h-screen gradient-mesh">
      <Navbar variant="app" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* App Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 sm:p-5 mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Welcome back!</p>
              <h1 className="text-lg font-bold font-[family-name:var(--font-display)]">Student Dashboard</h1>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {badges.map((b, idx) => (
                  <Badge key={idx} variant="primary" className="normal-case text-[10px]">{b}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-sm">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Zap className="w-3.5 h-3.5" /> {streak}d
              </span>
              <span className="w-px h-4 bg-white/10" />
              <span className="flex items-center gap-1 text-primary-light font-semibold">
                <Trophy className="w-3.5 h-3.5" /> Lvl {level}
              </span>
              <span className="w-px h-4 bg-white/10" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">{xp}/{level * 500} XP</span>
                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(xp % 500) / 5}%` }} />
                </div>
              </div>
            </div>

            <div className="relative">
              <select
                value={activeSubject}
                onChange={(e) => handleSubjectChange(e.target.value as SubjectId)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-sm font-medium outline-none focus:border-primary/50 cursor-pointer"
              >
                {Object.entries(SUBJECTS).map(([id, details]) => (
                  <option key={id} value={id}>{details.emoji} {details.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-xs hover:border-white/15 transition-colors cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${apiKey ? 'bg-success' : 'bg-warning'}`} />
              {apiKey ? 'Live AI' : 'Demo Mode'}
              <Settings className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-2xl p-5 mb-6 border-primary/20 overflow-hidden"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary-light" />
                Configure Gemini AI
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                Enter your Gemini API key for live AI question generation and Socratic tutoring. Stored locally in your browser.
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="password"
                  placeholder="Enter Gemini API Key..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                {apiKey && <CheckCircle className="w-5 h-5 text-success shrink-0" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedConcept ? (
          <StudentAssessment
            apiKey={apiKey}
            selectedConceptId={selectedConcept}
            onAssessmentCompleted={handleAssessmentCompleted}
            onBackToMap={() => setSelectedConcept('')}
          />
        ) : (
          <div className="space-y-6">
            <AnalyticsCards
              xp={xp}
              level={level}
              streak={streak}
              activeSubject={activeSubject}
              conceptStatuses={subjectProgress[activeSubject]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ConceptMap
                  subjectId={activeSubject}
                  conceptStatuses={subjectProgress[activeSubject]}
                  activeGapId={activeGap}
                  onSelectConcept={setSelectedConcept}
                />
              </div>

              <div className="space-y-6">
                <LearningProgress
                  activeSubject={activeSubject}
                  conceptStatuses={subjectProgress[activeSubject]}
                />
                <AIRecommendations onSelectConcept={setSelectedConcept} />
                <ActivityTimeline />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
